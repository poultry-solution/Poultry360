# 🧪 Testing Setup Complete!

Automated API testing is now configured for the Poultry360 backend using Jest, SuperTest, and Axios.

## ✅ What's Been Set Up

### 1. Dependencies Added to `package.json`

```json
"devDependencies": {
  "@types/axios": "^0.14.0",
  "@types/jest": "^29.5.13",
  "@types/supertest": "^6.0.2",
  "axios": "^1.7.9",
  "cross-env": "^7.0.3",
  "jest": "^29.7.0",
  "supertest": "^7.0.0",
  "ts-jest": "^29.2.5"
}
```

### 2. Test Scripts Added

```json
"scripts": {
  "test": "cross-env NODE_ENV=test jest",
  "test:watch": "cross-env NODE_ENV=test jest --watch",
  "test:coverage": "cross-env NODE_ENV=test jest --coverage"
}
```

### 3. Files Created

```
apps/backend/
├── jest.config.js           # Jest configuration
├── TESTING_SETUP.md         # This file
├── test/
│   ├── README.md            # Testing documentation
│   ├── setup.ts             # Global test setup
│   ├── fixtures/
│   │   └── users.ts         # Test user credentials
│   ├── helpers/
│   │   ├── api.helper.ts    # Axios HTTP client wrapper
│   │   └── auth.helper.ts   # Authentication utilities
│   └── api/
│       └── auth.test.ts     # Login tests ✅ READY TO RUN
```

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd /home/sidd/ideas/Poultry360
pnpm install
```

### Step 2: Create `.env.test` File

Create `apps/backend/.env.test` with:

```env
NODE_ENV=test
PORT=8081
API_URL=http://localhost:8081/api/v1
DATABASE_URL="postgresql://user:password@localhost:5432/poultry360"
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"
```

*Note: You can copy values from your `.env` file*

### Step 3: Start Backend Server

In one terminal:

```bash
cd apps/backend
pnpm dev
```

### Step 4: Run Tests

In another terminal:

```bash
cd apps/backend
pnpm test
```

## 📝 Test Users

Pre-configured test users (already connected in your system):

| Role   | Phone           | Password     | Role     |
|--------|-----------------|--------------|----------|
| Dealer | +9779800000004  | password123  | DEALER   |
| Farmer | +9779800000007  | password123  | OWNER    |

## ✅ Current Test Coverage

### Authentication Tests (`test/api/auth.test.ts`)

- ✅ Login dealer successfully
- ✅ Login farmer successfully
- ✅ Reject invalid credentials
- ✅ Reject non-existent user
- ✅ Authentication helper token management

**Expected Output:**

```
PASS  test/api/auth.test.ts
  Authentication API
    POST /auth/login
      ✓ should login dealer successfully (XXXms)
      ✓ should login farmer successfully (XXXms)
      ✓ should reject invalid credentials (XXXms)
      ✓ should reject non-existent user (XXXms)
    Authentication Helper
      ✓ should login and store dealer token (XXXms)
      ✓ should login and store farmer token (XXXms)

Test Suites: 1 passed, 1 total
Tests:       6 passed, 6 total
```

## 🔨 Next Steps: Expand Test Coverage

### Create Sales Tests (`test/api/sales.test.ts`)

```typescript
import { ApiHelper } from '../helpers/api.helper';
import { AuthHelper } from '../helpers/auth.helper';

describe('Dealer Sales API', () => {
  let apiHelper: ApiHelper;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    apiHelper = new ApiHelper();
    authHelper = new AuthHelper(apiHelper);
    await authHelper.loginDealer();
    authHelper.setDealerAuth();
  });

  it('should create a new sale for connected farmer', async () => {
    // TODO: Get dealer ID and customer ID
    // TODO: Create sale with items
    // TODO: Verify sale created
    // TODO: Check balance updated
  });

  it('should create sale with initial payment', async () => {
    // TODO: Create sale with paidAmount
    // TODO: Verify dueAmount calculated correctly
  });
});
```

### Create Payment Tests (`test/api/payments.test.ts`)

```typescript
describe('Payment System', () => {
  it('should add general payment (auto-allocate)', async () => {
    // TODO: Create multiple unpaid sales
    // TODO: Add general payment
    // TODO: Verify FIFO allocation
    // TODO: Check balances updated
  });

  it('should handle overpayment and create advance', async () => {
    // TODO: Create sale with रू 1000 due
    // TODO: Pay रू 1200
    // TODO: Verify advance balance = -रू 200
  });
});
```

## 🛠 Helper Examples

### Using API Helper

```typescript
import { ApiHelper } from '../helpers/api.helper';

const apiHelper = new ApiHelper();

// GET request
const response = await apiHelper.axios.get('/dealer/sales');

// POST request
const response = await apiHelper.axios.post('/dealer/sales', {
  customerId: 'xxx',
  items: [...]
});

// With authentication
apiHelper.setAuthToken('your-token-here');
const response = await apiHelper.axios.get('/protected-route');
```

### Using Auth Helper

```typescript
import { AuthHelper } from '../helpers/auth.helper';

const authHelper = new AuthHelper(apiHelper);

// Login and get token
const dealerToken = await authHelper.loginDealer();

// Set authentication for all requests
authHelper.setDealerAuth();

// Now all apiHelper.axios requests will use dealer token
const response = await apiHelper.axios.get('/dealer/ledger');

// Switch to farmer
const farmerToken = await authHelper.loginFarmer();
authHelper.setFarmerAuth();
```

## 🐛 Debugging

### Enable Console Logs

In `test/setup.ts`, comment out:

```typescript
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
```

### Run Single Test

```bash
pnpm test -- -t "should login dealer successfully"
```

### Verbose Output

```bash
pnpm test -- --verbose
```

## 📊 Benefits

✅ **No More Manual Testing**: Automated tests replace repetitive manual clicks  
✅ **Regression Prevention**: Catch bugs before they reach production  
✅ **Documentation**: Tests serve as executable API documentation  
✅ **Confidence**: Refactor safely knowing tests will catch breaks  
✅ **Speed**: Run hundreds of tests in seconds vs hours of manual testing  

## 🎯 Recommended Test Scenarios

1. **Sales Flow**
   - Create sale for connected farmer
   - Create sale with multiple items
   - Verify sale appears in both dealer and farmer views
   - Check inventory updates

2. **Payment Flow**
   - General payment auto-allocation (FIFO)
   - Bill-wise payment to specific sale
   - Overpayment creating advance
   - Advance auto-applying to next sale
   - Payment sync between dealer and farmer

3. **Balance Verification**
   - Customer balance in parties table
   - Total Due in summary
   - Ledger entry creation
   - EntityTransaction creation for farmer

4. **Error Handling**
   - Invalid sale data
   - Payment exceeding due
   - Unauthorized access
   - Missing required fields

---

**Ready to run!** Start with: `pnpm install && pnpm test`
