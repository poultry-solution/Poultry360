import { ApiHelper } from '../helpers/api.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { DatabaseHelper } from '../helpers/database.helper';
import { TEST_USERS } from '../fixtures/users';

describe('Dealer Sales Workflow', () => {
  let apiHelper: ApiHelper;
  let authHelper: AuthHelper;
  let dealerId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    apiHelper = new ApiHelper();
    authHelper = new AuthHelper(apiHelper);

    // Setup separate dealer and farmer accounts plus a dealer-owned manual customer.
    await DatabaseHelper.setupTestUsers(
      TEST_USERS.dealer,
      TEST_USERS.farmer
    );

    // Dealer sales are fully within the Dealer module.
    await authHelper.loginDealer();
    authHelper.setDealerAuth();
  }, 60000); // Increase timeout for database setup/cleanup

  afterEach(() => {
    // Clear auth after each test to avoid conflicts
  });

  describe('Setup: Get Customer and Product', () => {
    it('should get the dealer-owned manual customer', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/sales/customers');
      
      console.log('✓ Customers response status:', response.status);
      console.log('✓ Customers count:', response.body.data?.length || 0);
      
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);

      const manualCustomer = response.body.data.find(
        (c: any) => c.name === 'Test Manual Customer' && c.source === 'MANUAL'
      );
      expect(manualCustomer).toBeDefined();
      expect(manualCustomer.farmerId).toBeNull();
      customerId = manualCustomer.id;
    });

    it('should get or create a product', async () => {
      authHelper.setDealerAuth();

      // Try to get existing products
      const productsResponse = await apiHelper.get('/dealer/products');
      
      if (productsResponse.body.data && productsResponse.body.data.length > 0) {
        // Use existing product
        productId = productsResponse.body.data[0].id;
        console.log('✓ Using existing product ID:', productId);
      } else {
        // Create a test product
        const createResponse = await apiHelper.post('/dealer/products', {
          name: 'Test Feed Product',
          type: 'FEED',
          unit: 'kg',
          unitPrice: 50,
          currentStock: 1000,
        });

        productId = createResponse.body.data.id;
        console.log('✓ Created new product ID:', productId);
      }

      expect(productId).toBeDefined();
    });
  });

  describe('Step 1: Dealer creates a direct manual-customer sale', () => {
    it('should create a sale with the correct due amount', async () => {
      authHelper.setDealerAuth();

      const saleData = {
        customerId: customerId,
        items: [
          {
            productId: productId,
            quantity: 10,
            unitPrice: 50,
          },
        ],
        paidAmount: 100, // Partial payment
        paymentMethod: 'CASH',
        notes: 'Test manual-customer sale',
        date: new Date().toISOString(),
      };

      const response = await apiHelper.post('/dealer/sales', saleData);
      
      console.log('✓ Sale response status:', response.status);
      console.log('✓ Sale response:', JSON.stringify(response.body, null, 2));

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      
      expect(response.body.data).toMatchObject({ customerId, totalAmount: '500', paidAmount: '100', dueAmount: '400' });
      dealerId = response.body.data.dealerId;
    });
  });

  describe('Step 2: Verify the dealer sale and ledger', () => {
    it('should show actual sale in dealer sales list', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/sales');
      
      console.log('✓ Sales count:', response.body.data?.length || 0);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Find sale linked to our customer with matching amount
      const sale = response.body.data.find((s: any) => {
        return s.customerId === customerId && Number(s.totalAmount) === 500;
      });

      expect(sale).toBeDefined();
      expect(Number(sale.totalAmount)).toBe(500);
      expect(Number(sale.paidAmount)).toBe(100);
      expect(Number(sale.dueAmount)).toBe(400);
    });
  });

  describe('Step 3: Verify manual customer balance', () => {
    it('should show correct customer balance', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get('/dealer/ledger/parties');

      expect(response.status).toBe(200);
      
      console.log('📊 All parties:', JSON.stringify(response.body.data?.map((c: any) => ({
        id: c.id,
        name: c.name,
        balance: c.balance,
        source: c.source
      })), null, 2));
      console.log('🔍 Looking for customerId:', customerId);
      
      const customer = response.body.data.find((c: any) => c.id === customerId);
      expect(customer).toBeDefined();
      
      console.log('💰 Customer balance:', customer.balance, 'Expected: 400');
      
      // With clean state: 500 total - 100 paid = 400 due
      expect(Number(customer.balance)).toBe(400);
    });

    it('should show ledger entries created', async () => {
      authHelper.setDealerAuth();

      const response = await apiHelper.get(`/dealer/ledger?partyId=${customerId}&limit=100`);

      expect(response.status).toBe(200);
      
      const entries = response.body.data || [];
      console.log('✓ Ledger entries count:', entries.length);
      
      expect(entries).toEqual(expect.arrayContaining([
        expect.objectContaining({ type: 'SALE' }),
        expect.objectContaining({ type: 'PAYMENT_RECEIVED' }),
      ]));
    });
  });

  describe('Error Cases', () => {
    it('should reject another dealer account customer', async () => {
      authHelper.setDealerAuth();
      
      const saleData = {
        customerId: 'not-owned-customer',
        items: [{ productId: productId, quantity: 5, unitPrice: 50 }],
        paidAmount: 0,
        paymentMethod: 'CASH',
      };

      const createResponse = await apiHelper.post('/dealer/sales', saleData);
      expect(createResponse.status).toBe(404);
    });
  });
});
