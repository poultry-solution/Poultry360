import { ApiHelper } from '../helpers/api.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { DatabaseHelper } from '../helpers/database.helper';
import { TEST_USERS } from '../fixtures/users';

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

    // Setup separate accounts and a dealer-owned manual customer.
    const setup = await DatabaseHelper.setupTestUsers(
      TEST_USERS.dealer,
      TEST_USERS.farmer
    );
    dealerId = setup.dealerId;

    // Login and setup
    await authHelper.loginDealer();
    authHelper.setDealerAuth();

    // Get customer
    const customersResponse = await apiHelper.get('/dealer/sales/customers');
    const manualCustomer = customersResponse.body.data.find(
      (c: any) => c.name === 'Test Manual Customer' && c.source === 'MANUAL'
    );
    expect(manualCustomer).toBeDefined();
    expect(manualCustomer.farmerId).toBeNull();
    customerId = manualCustomer.id;

    // Get product
    const productsResponse = await apiHelper.get('/dealer/products');
    productId = productsResponse.body.data[0].id;
  }, 60000); // Increase timeout for database setup/cleanup

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
      
      sale1Id = response.body.data.id;

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

      sale2Id = response.body.data.id;

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

      sale3Id = response.body.data.id;

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

  describe('Test 1: General payment for a manual customer', () => {
    it('should pay रू 1800 to the customer account', async () => {
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

      console.log('✓ General payment of रू 1800 applied to account');
    });

    it('should NOT update sale paidAmount/dueAmount (account-only; sales are history)', async () => {
      authHelper.setDealerAuth();

      const r1 = await apiHelper.get(`/dealer/sales/${sale1Id}`);
      const r2 = await apiHelper.get(`/dealer/sales/${sale2Id}`);
      const r3 = await apiHelper.get(`/dealer/sales/${sale3Id}`);

      expect(Number(r1.body.data.paidAmount)).toBe(0);
      expect(Number(r1.body.data.dueAmount || 0)).toBe(1000);
      expect(Number(r2.body.data.paidAmount)).toBe(0);
      expect(Number(r2.body.data.dueAmount || 0)).toBe(500);
      expect(Number(r3.body.data.paidAmount)).toBe(0);
      expect(Number(r3.body.data.dueAmount || 0)).toBe(300);
      console.log('✓ Sale amounts unchanged (account-only model)');
    });

    it('should show the manual customer account balance as zero', async () => {
      authHelper.setDealerAuth();

      const parties = await apiHelper.get('/dealer/ledger/parties');
      const customer = parties.body.data.find((party: any) => party.id === customerId);
      expect(Number(customer.balance)).toBe(0);
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
      // Sale 2: रू 500
      authHelper.setDealerAuth();
      const response2 = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 10, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      });
      newSale1Id = response1.body.data.id;
      newSale2Id = response2.body.data.id;

      expect(newSale1Id).toBeDefined();
      expect(newSale2Id).toBeDefined();
    });

    it('should pay रू 1200 against the customer account', async () => {
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

    it('keeps the first sale payment fields frozen', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${newSale1Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(0);
      expect(Number(sale.dueAmount)).toBe(1000);
    });

    it('keeps the second sale payment fields frozen', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${newSale2Id}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(0);
      expect(Number(sale.dueAmount)).toBe(500);
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

      // Check customer balance
      const balanceResponse = await apiHelper.get('/dealer/ledger/parties');
      const customer = balanceResponse.body.data.find((c: any) => c.id === customerId);

      // New sale (300) - advance (200) = 100 balance
      expect(Number(customer.balance)).toBe(100);
      console.log('✓ Advance auto-applied to new sale. New balance: रू', customer.balance);
    });
  });

  describe('Test 4: Account payment made with a sale reference', () => {
    let specificSaleId: string;

    it('setup: create a specific sale', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/sales', {
        customerId,
        items: [{ productId, quantity: 10, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      });

      specificSaleId = response.body.data.id;

      expect(specificSaleId).toBeDefined();
    });

    it('should record an account payment', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.post('/dealer/ledger/payments', {
        saleId: specificSaleId,
        amount: 300,
        paymentMethod: 'CASH',
        notes: 'Account payment with a sale reference',
      });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({ newCustomerBalance: 300 });
    });

    it('does not turn the reference sale into a bill-wise payment', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/sales/${specificSaleId}`);
      const sale = response.body.data;

      expect(Number(sale.paidAmount)).toBe(0);
      expect(Number(sale.dueAmount)).toBe(500);
    });
  });

  describe('Test 5: Manual-customer data isolation', () => {
    it('does not create a Farmer-side dealer record', async () => {
      await authHelper.loginFarmer();
      authHelper.setFarmerAuth();
      const response = await apiHelper.get('/dealers');
      expect(response.status).toBe(200);
      expect(response.body.data.some((dealer: any) => dealer.id === dealerId)).toBe(false);
    });
  });
});
