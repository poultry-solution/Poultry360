import { ApiHelper } from '../helpers/api.helper';
import { AuthHelper } from '../helpers/auth.helper';
import { TEST_USERS } from '../fixtures/users';

describe('Authentication API', () => {
  let apiHelper: ApiHelper;
  let authHelper: AuthHelper;

  beforeAll(() => {
    apiHelper = new ApiHelper();
    authHelper = new AuthHelper(apiHelper);
  });

  afterEach(() => {
    apiHelper.clearAuthToken();
  });

  describe('POST /auth/login', () => {
    it('should login dealer successfully', async () => {
      const response = await apiHelper.post('/auth/login', {
        emailOrPhone: TEST_USERS.dealer.phone,
        password: TEST_USERS.dealer.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('user');
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('role');
      expect(response.body.user.phone).toBe(TEST_USERS.dealer.phone);
    });

    it('should login farmer successfully', async () => {
      const response = await apiHelper.post('/auth/login', {
        emailOrPhone: TEST_USERS.farmer.phone,
        password: TEST_USERS.farmer.password,
      });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body.user.phone).toBe(TEST_USERS.farmer.phone);
    });

    it('should reject invalid credentials', async () => {
      const response = await apiHelper.post('/auth/login', {
        emailOrPhone: TEST_USERS.dealer.phone,
        password: 'wrongpassword',
      });

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('Invalid credentials');
    });

    it('should reject non-existent user', async () => {
      const response = await apiHelper.post('/auth/login', {
        emailOrPhone: '+9779999999999',
        password: 'password123',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('Authentication Helper', () => {
    it('should login and store dealer token', async () => {
      const token = await authHelper.loginDealer();
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(authHelper.getDealerToken()).toBe(token);
    });

    it('should login and store farmer token', async () => {
      const token = await authHelper.loginFarmer();
      
      expect(token).toBeDefined();
      expect(authHelper.getFarmerToken()).toBe(token);
    });
  });
});
