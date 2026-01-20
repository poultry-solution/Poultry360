import { ApiHelper } from './api.helper';
import { TEST_USERS } from '../fixtures/users';

export class AuthHelper {
  private apiHelper: ApiHelper;
  private tokens: Map<string, string> = new Map();

  constructor(apiHelper: ApiHelper) {
    this.apiHelper = apiHelper;
  }

  async loginDealer() {
    const response = await this.apiHelper.post('/auth/login', {
      emailOrPhone: TEST_USERS.dealer.phone,
      password: TEST_USERS.dealer.password,
    });
    
    const { accessToken } = response.body;
    this.tokens.set('dealer', accessToken);
    return accessToken;
  }

  async loginFarmer() {
    const response = await this.apiHelper.post('/auth/login', {
      emailOrPhone: TEST_USERS.farmer.phone,
      password: TEST_USERS.farmer.password,
    });
    
    const { accessToken } = response.body;
    this.tokens.set('farmer', accessToken);
    return accessToken;
  }

  getDealerToken() {
    return this.tokens.get('dealer');
  }

  getFarmerToken() {
    return this.tokens.get('farmer');
  }

  setDealerAuth() {
    const token = this.getDealerToken();
    if (token) this.apiHelper.setAuthToken(token);
  }

  setFarmerAuth() {
    const token = this.getFarmerToken();
    if (token) this.apiHelper.setAuthToken(token);
  }
}
