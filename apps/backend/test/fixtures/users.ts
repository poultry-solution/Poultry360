export const TEST_USERS = {
  dealer: {
    phone: '+9779800000004',
    password: 'password123',
    name: 'Test Dealer',
    role: 'DEALER' as const,
  },
  farmer: {
    phone: '+9779800000006',  // Auto-created and connected to dealer
    password: 'password123',
    name: 'Test Farmer',
    role: 'OWNER' as const,
  },
};

export const API_BASE_URL = process.env.API_URL || 'http://localhost:8081/api/v1';
