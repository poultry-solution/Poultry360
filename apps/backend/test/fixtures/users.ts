export const TEST_USERS = {
  dealer: {
    phone: '+9779800000004',
    password: 'password123',
  },
  farmer: {
    phone: '+9779800000006',  // This farmer is connected to the dealer
    password: 'password123',
  },
};

export const API_BASE_URL = process.env.API_URL || 'http://localhost:8081/api/v1';
