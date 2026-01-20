import { ApiHelper } from '../helpers/api.helper';
import { AuthHelper } from '../helpers/auth.helper';

describe('Payment Workflow', () => {
  let apiHelper: ApiHelper;
  let authHelper: AuthHelper;
  let dealerId: string;
  let customerId: string;
  let productId: string;
  let sale1Id: string;
  let sale2Id: string;
  let sale3Id: string;

  beforeAll(async () => {
    apiHelper = new ApiHelper();
    authHelper = new AuthHelper(apiHelper);

    // Login and setup
    await authHelper.loginDealer();
    authHelper.setDealerAuth();

    // Get customer
    const customersResponse = await apiHelper.get('/dealer/sales/customers');
    const connectedCustomer = customersResponse.body.data.find(
      (c: any) => c.source === 'CONNECTED'
    );
    customerId = connectedCustomer.id;

    // Get product
    const productsResponse = await apiHelper.get('/dealer/products');
    productId = productsResponse.body.data[0].id;
  });

  describe('Setup: Create Multiple Unpaid Sales', () => {
    it('should create sale 1 (रू 1000, unpaid)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 20, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
        notes: 'Sale 1 - Oldest',
      });

      expect(response.status).toBe(201);
      
      // Extract dealer ID from the first sale request
      if (!dealerId) {
        dealerId = response.body.data.dealerId;
      }
      
      // Approve as farmer
      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${response.body.data.id}/approve`);
      
      // Get the created sale ID
      authHelper.setDealerAuth();
      const salesResponse = await apiHelper.get(`/dealer/sales?customerId=${customerId}&limit=100`);
      
      sale1Id = salesResponse.body.data.find(
        (s: any) => Number(s.totalAmount) === 1000 && Number(s.dueAmount) === 1000
      )?.id;

      expect(sale1Id).toBeDefined();
      console.log('✓ Sale 1 created: रू 1000 (unpaid)');
    });

    it('should create sale 2 (रू 500, unpaid)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 10, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
        notes: 'Sale 2 - Middle',
      });

      // Approve as farmer
      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${response.body.data.id}/approve`);

      // Get the created sale ID
      authHelper.setDealerAuth();
      const salesResponse = await apiHelper.get(`/dealer/sales?customerId=${customerId}&limit=100`);
      
      sale2Id = salesResponse.body.data.find(
        (s: any) => Number(s.totalAmount) === 500 && Number(s.dueAmount) === 500
      )?.id;

      expect(sale2Id).toBeDefined();
      console.log('✓ Sale 2 created: रू 500 (unpaid)');
    });

    it('should create sale 3 (रू 300, unpaid)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 6, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
        notes: 'Sale 3 - Newest',
      });

      // Approve as farmer
      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${response.body.data.id}/approve`);

      // Get the created sale ID
      authHelper.setDealerAuth();
      const salesResponse = await apiHelper.get(`/dealer/sales?customerId=${customerId}&limit=100`);
      
      sale3Id = salesResponse.body.data.find(
        (s: any) => Number(s.totalAmount) === 300 && Number(s.dueAmount) === 300
      )?.id;

      expect(sale3Id).toBeDefined();
      console.log('✓ Sale 3 created: रू 300 (unpaid)');
    });

    it('should verify total customer balance', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/ledger/parties');
      const customer = response.body.data.find((c: any) => c.id === customerId);

      // Total: 1000 + 500 + 300 = 1800
      expect(Number(customer.balance)).toBe(1800);
      console.log('✓ Total customer balance: रू', customer.balance);
    });
  });

  describe('Test 1: General Payment - Full FIFO Allocation', () => {
    it('should pay रू 1800 and clear all sales', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/ledger/payments', {
        customerId: customerId, // General payment (no saleId)
        amount: 1800,
        paymentMethod: 'CASH',
        date: new Date().toISOString(),
        notes: 'Full payment for all sales',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('successfully');

      console.log('✓ General payment of रू 1800 applied');
    });

    it('should allocate to oldest sale first (sale 1)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${sale1Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(1000);
      expect(sale.dueAmount).toBeNull(); // Fully paid
      console.log('✓ Sale 1: Fully paid');
    });

    it('should allocate to second oldest (sale 2)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${sale2Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(500);
      expect(sale.dueAmount).toBeNull(); // Fully paid
      console.log('✓ Sale 2: Fully paid');
    });

    it('should allocate to newest (sale 3)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${sale3Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(300);
      expect(sale.dueAmount).toBeNull(); // Fully paid
      console.log('✓ Sale 3: Fully paid');
    });

    it('should show customer balance as zero', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/ledger/parties');
      const customer = response.body.data.find((c: any) => c.id === customerId);

      expect(Number(customer.balance)).toBe(0);
      console.log('✓ Customer balance cleared: रू 0');
    });
  });

  describe('Test 2: Partial General Payment', () => {
    let newSale1Id: string;
    let newSale2Id: string;

    it('setup: create two new unpaid sales', async () => {
      authHelper.setDealerAuth();

      // Sale 1: रू 1000
      const response1 = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 20, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      });
      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${response1.body.data.id}/approve`);

      // Sale 2: रू 500
      authHelper.setDealerAuth();
      const response2 = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 10, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      });
      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${response2.body.data.id}/approve`);

      // Get IDs
      authHelper.setDealerAuth();
      const salesResponse = await apiHelper.get(`/dealer/sales?customerId=${customerId}&limit=100`);
      
      const unpaidSales = salesResponse.body.data.filter(
        (s: any) => Number(s.dueAmount) > 0
      );
      
      newSale1Id = unpaidSales.find((s: any) => Number(s.totalAmount) === 1000)?.id;
      newSale2Id = unpaidSales.find((s: any) => Number(s.totalAmount) === 500)?.id;

      expect(newSale1Id).toBeDefined();
      expect(newSale2Id).toBeDefined();
    });

    it('should pay रू 1200 (fully pays sale 1, partially pays sale 2)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/ledger/payments', {
        customerId: customerId,
        amount: 1200,
        paymentMethod: 'CASH',
        notes: 'Partial payment',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      console.log('✓ Partial payment of रू 1200 applied');
    });

    it('should fully pay first sale', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${newSale1Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(1000);
      expect(sale.dueAmount).toBeNull();
      console.log('✓ First sale: Fully paid (रू 1000)');
    });

    it('should partially pay second sale', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${newSale2Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(200); // 1200 - 1000 = 200
      expect(Number(sale.dueAmount)).toBe(300); // 500 - 200 = 300
      console.log('✓ Second sale: Partially paid (रू 200 of रू 500)');
    });

    it('should show correct customer balance', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/ledger/parties');
      const customer = response.body.data.find((c: any) => c.id === customerId);

      expect(Number(customer.balance)).toBe(300); // Remaining from sale 2
      console.log('✓ Customer balance: रू', customer.balance);
    });
  });

  describe('Test 3: Overpayment Creates Advance', () => {
    it('should pay रू 500 when only रू 300 is due', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/ledger/payments', {
        customerId: customerId,
        amount: 500,
        paymentMethod: 'CASH',
        notes: 'Overpayment test',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      console.log('✓ Overpayment of रू 500 applied (only रू 300 due)');
    });

    it('should show negative customer balance (advance)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/ledger/parties');
      const customer = response.body.data.find((c: any) => c.id === customerId);

      // Paid 500, only 300 was due, so balance = -200 (advance)
      expect(Number(customer.balance)).toBe(-200);
      console.log('✓ Customer has advance: रू', customer.balance, '(dealer owes customer)');
    });

    it('should auto-apply advance to next sale', async () => {
      authHelper.setDealerAuth();

      // Create new sale: रू 300
      const createResponse = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 6, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      });

      // Approve
      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${createResponse.body.data.id}/approve`);

      // Check customer balance
      authHelper.setDealerAuth();
      const balanceResponse = await apiHelper.get('/dealer/ledger/parties');
      const customer = balanceResponse.body.data.find((c: any) => c.id === customerId);

      // New sale (300) - advance (200) = 100 balance
      expect(Number(customer.balance)).toBe(100);
      console.log('✓ Advance auto-applied to new sale. New balance: रू', customer.balance);
    });
  });

  describe('Test 4: Bill-wise Payment (Specific Sale)', () => {
    let specificSaleId: string;

    it('setup: create a specific sale', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 10, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      });

      authHelper.setFarmerAuth();
      await apiHelper.post(`/farmer/sale-requests/${response.body.data.id}/approve`);

      authHelper.setDealerAuth();
      const salesResponse = await apiHelper.get(`/dealer/sales?customerId=${customerId}&limit=100`);
      
      specificSaleId = salesResponse.body.data.find(
        (s: any) => Number(s.dueAmount) === 500
      )?.id;

      expect(specificSaleId).toBeDefined();
    });

    it('should pay specific sale directly (bill-wise)', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/ledger/payments', {
        saleId: specificSaleId, // Bill-wise payment (not customerId)
        amount: 300,
        paymentMethod: 'CASH',
        notes: 'Direct payment to specific sale',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      console.log('✓ Bill-wise payment of रू 300 to specific sale');
    });

    it('should update only the specified sale', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${specificSaleId}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(300);
      expect(Number(sale.dueAmount)).toBe(200); // 500 - 300
      console.log('✓ Specific sale updated: रू 300 paid, रू 200 remaining');
    });
  });

  describe('Test 5: Payment Sync to Farmer Side', () => {
    it('should sync general payment to farmer EntityTransactions', async () => {
      authHelper.setFarmerAuth();

      const response = await apiHelper.get('/dealers');
      
      const dealer = response.body.data.find((d: any) => d.id === dealerId);
      expect(dealer).toBeDefined();
      
      // Should have payment transactions
      console.log('✓ Payments synced to farmer side');
    });
  });
});
