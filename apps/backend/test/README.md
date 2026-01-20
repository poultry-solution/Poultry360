# API Testing with Jest & SuperTest

Automated tests for the Poultry360 backend API using Jest, SuperTest, and Axios.

## Setup

### 1. Install Dependencies

```bash
cd apps/backend
pnpm install
```

### 2. Configure Test Environment

Create or update `.env.test` with your test configuration:

```env
NODE_ENV=test
PORT=8081
API_URL=http://localhost:8081/api/v1
DATABASE_URL="your-test-database-url"
```

### 3. Start the Backend Server

In one terminal:

```bash
cd apps/backend
pnpm dev
```

## Running Tests

### Run All Tests

```bash
pnpm test
```

### Run Tests in Watch Mode

```bash
pnpm test:watch
```

### Run Tests with Coverage

```bash
pnpm test:coverage
```

### Run Specific Test File

```bash
pnpm test auth.test
```

## Test Structure

```
test/
├── setup.ts              # Global test configuration
├── fixtures/
│   └── users.ts         # Test user credentials
├── helpers/
│   ├── api.helper.ts    # Axios HTTP client wrapper
│   └── auth.helper.ts   # Authentication utilities
└── api/
    ├── auth.test.ts     # Login & authentication tests
    ├── sales.test.ts    # Sales creation tests (TODO)
    └── payments.test.ts # Payment & balance tests (TODO)
```

## Test Users

The following test users are pre-configured:

- **Dealer**: `+9779800000004` / `password123`
- **Farmer**: `+9779800000007` / `password123`

Both users are already connected in the system.

## Writing Tests

### Example: Testing an Endpoint

```typescript
import { ApiHelper } from '../helpers/api.helper';
import { AuthHelper } from '../helpers/auth.helper';

describe('My API Endpoint', () => {
  let apiHelper: ApiHelper;
  let authHelper: AuthHelper;

  beforeAll(async () => {
    apiHelper = new ApiHelper();
    authHelper = new AuthHelper(apiHelper);
    
    // Login as dealer
    await authHelper.loginDealer();
    authHelper.setDealerAuth();
  });

  it('should do something', async () => {
    const response = await apiHelper.axios.get('/endpoint');
    expect(response.status).toBe(200);
  });
});
```

## Current Test Coverage

### ✅ Completed

- **Authentication Tests** (`auth.test.ts`)
  - Dealer login success
  - Farmer login success
  - Invalid credentials rejection
  - Non-existent user rejection
  - Token management helpers

### 🚧 TODO

- **Sales Tests** (`sales.test.ts`)
  - Create sale for connected farmer
  - Create sale with multiple items
  - Handle payment at time of sale
  - Calculate due amount correctly

- **Payment Tests** (`payments.test.ts`)
  - Add general payment (auto-allocate)
  - Add bill-wise payment to specific sale
  - Handle overpayment and create advance
  - Verify customer balance
  - Sync payment to farmer side for linked sales

## Debugging

To see console output during tests, comment out the console mocking in `test/setup.ts`:

```typescript
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
// };
```

## Troubleshooting

### Tests Timing Out

Increase the timeout in `jest.config.js`:

```javascript
testTimeout: 60000, // 60 seconds
```

### Connection Errors

Make sure the backend server is running on port 8081 before running tests.

### Database Issues

Tests currently use the development database. For better isolation, consider:
1. Creating a separate test database
2. Using database transactions and rollbacks in tests
3. Seeding test data before each test suite
