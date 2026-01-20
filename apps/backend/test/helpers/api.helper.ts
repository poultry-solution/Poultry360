import request from 'supertest';
import app from '../../src/index';

export class ApiHelper {
  private authToken: string | null = null;

  /**
   * Make a GET request using SuperTest
   */
  async get(url: string) {
    const req = request(app).get(`/api/v1${url}`);
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return req;
  }

  /**
   * Make a POST request using SuperTest
   */
  async post(url: string, data?: any) {
    const req = request(app)
      .post(`/api/v1${url}`)
      .send(data);
    
    if (this.authToken) {
      req.set('Authorization', `Bearer ${this.authToken}`);
    }
    
    return req;
  }

  /**
   * Set authentication token for subsequent requests
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Clear authentication token
   */
  clearAuthToken() {
    this.authToken = null;
  }
}
