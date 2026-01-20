import { ApiHelper } from './api.helper';

interface TestUser {
  phone: string;
  password: string;
  name: string;
  role: 'DEALER' | 'OWNER';
}

export class DatabaseHelper {
  /**
   * Setup and reset test users via API endpoint
   * Creates users if missing, connects them, and cleans data
   */
  static async setupTestUsers(
    dealer: TestUser,
    farmer: TestUser
  ): Promise<{ dealerId: string; farmerId: string }> {
    const apiHelper = new ApiHelper();
    
    const response = await apiHelper.post('/test/setup-users', {
      dealerPhone: dealer.phone,
      dealerPassword: dealer.password,
      dealerName: dealer.name,
      farmerPhone: farmer.phone,
      farmerPassword: farmer.password,
      farmerName: farmer.name,
    });

    if (response.status !== 200) {
      throw new Error(`Failed to setup test users: ${response.body.message}`);
    }

    return response.body.data;
  }
}
