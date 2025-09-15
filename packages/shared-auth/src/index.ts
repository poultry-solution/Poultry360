// Shared authentication utilities for cross-port development
export interface AuthData {
  accessToken: string;
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: string;
    companyName?: string;
  };
}

export interface CrossPortAuthOptions {
  mainAppPort: number;
  doctorAppPort: number;
  apiBaseUrl: string;
}

class CrossPortAuth {
  private options: CrossPortAuthOptions;
  private storageKey = 'poultry360-auth';

  constructor(options: CrossPortAuthOptions) {
    this.options = options;
  }

  // Store auth data in localStorage with a shared key
  setAuthData(authData: AuthData): void {
    console.log('🔍 setAuthData - input authData:', authData);
    
    const data = {
      ...authData,
      timestamp: Date.now(),
      source: this.getCurrentPort(),
    };
    
    console.log('🔍 setAuthData - processed data:', data);
    console.log('🔍 setAuthData - storageKey:', this.storageKey);
    
    localStorage.setItem(this.storageKey, JSON.stringify(data));
    
    // Verify the data was stored
    const storedData = localStorage.getItem(this.storageKey);
    console.log('🔍 setAuthData - verification - stored data:', storedData);
    
    // Also try to sync with other ports via postMessage
    this.broadcastAuthUpdate(data);
  }

  // Get auth data from localStorage
  getAuthData(): AuthData | null {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (!stored) return null;

      const data = JSON.parse(stored);
      
      // Check if token is expired (1 hour)
      const isExpired = Date.now() - data.timestamp > 60 * 60 * 1000;
      if (isExpired) {
        this.clearAuthData();
        return null;
      }

      return {
        accessToken: data.accessToken,
        user: data.user,
      };
    } catch (error) {
      console.error('Error parsing auth data:', error);
      return null;
    }
  }

  // Clear auth data
  clearAuthData(): void {
    localStorage.removeItem(this.storageKey);
    this.broadcastAuthUpdate(null);
  }

  // Get current port
  private getCurrentPort(): number {
    return parseInt(window.location.port) || (window.location.protocol === 'https:' ? 443 : 80);
  }

  // Broadcast auth updates to other ports
  private broadcastAuthUpdate(authData: any): void {
    // This won't work in development due to CORS, but it's here for completeness
    // In production with subdomains, this could be useful
    try {
      const message = {
        type: 'AUTH_UPDATE',
        data: authData,
        source: this.getCurrentPort(),
      };
      
      // Try to send to other ports (will fail in dev due to CORS)
      const otherPorts = [this.options.mainAppPort, this.options.doctorAppPort]
        .filter(port => port !== this.getCurrentPort());
      
      otherPorts.forEach(port => {
        try {
          const iframe = document.createElement('iframe');
          iframe.style.display = 'none';
          iframe.src = `${window.location.protocol}//${window.location.hostname}:${port}/auth-sync`;
          document.body.appendChild(iframe);
          setTimeout(() => document.body.removeChild(iframe), 100);
        } catch (e) {
          // Ignore CORS errors in development
        }
      });
    } catch (error) {
      // Ignore errors in development
    }
  }

  // Navigate to doctor app with auth data
  async navigateToDoctorApp(): Promise<void> {
    const authData = this.getAuthData();
    console.log('🔍 navigateToDoctorApp - authData:', authData);
    
    if (!authData) {
      console.error('❌ No auth data available for navigation');
      return;
    }

    try {
      // Store auth data on the server temporarily
      const response = await fetch(`${this.options.apiBaseUrl}/auth/store-cross-port`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          authData,
          timestamp: Date.now(),
          source: 'main-app'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('🔍 navigateToDoctorApp - stored auth data on server:', result);
        
        // Navigate to doctor app with the session ID
        const doctorUrl = `${window.location.protocol}//${window.location.hostname}:${this.options.doctorAppPort}/auth-sync?session=${result.sessionId}`;
        console.log('🔍 navigateToDoctorApp - navigating to:', doctorUrl);
        window.location.href = doctorUrl;
      } else {
        console.error('❌ Failed to store auth data on server');
        // Fallback to direct navigation
        const doctorUrl = `${window.location.protocol}//${window.location.hostname}:${this.options.doctorAppPort}/auth-sync`;
        window.location.href = doctorUrl;
      }
    } catch (error) {
      console.error('❌ Error storing auth data on server:', error);
      // Fallback to direct navigation
      const doctorUrl = `${window.location.protocol}//${window.location.hostname}:${this.options.doctorAppPort}/auth-sync`;
      window.location.href = doctorUrl;
    }
  }

  // Navigate to main app with auth data
  navigateToMainApp(): void {
    const authData = this.getAuthData();
    if (!authData) {
      console.error('No auth data available');
      return;
    }

    // Create a temporary storage for the navigation
    const tempKey = `temp-auth-${Date.now()}`;
    localStorage.setItem(tempKey, JSON.stringify(authData));
    
    // Navigate to main app dashboard
    const mainUrl = `${window.location.protocol}//${window.location.hostname}:${this.options.mainAppPort}/dashboard/home?auth=${tempKey}`;
    window.location.href = mainUrl;
  }

  // Handle auth data from URL parameter (for cross-port navigation)
  async handleAuthFromUrl(): Promise<AuthData | null> {
    console.log('🔍 handleAuthFromUrl - checking for cross-port auth data');
    
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sessionId = urlParams.get('session');
      
      if (sessionId) {
        console.log('🔍 handleAuthFromUrl - session ID:', sessionId);
        
        // Fetch auth data from server using session ID
        const response = await fetch(`${this.options.apiBaseUrl}/auth/get-cross-port?session=${sessionId}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          }
        });

        if (response.ok) {
          const result = await response.json();
          console.log('🔍 handleAuthFromUrl - server response:', result);
          
          if (result.authData && result.authData.accessToken && result.authData.user) {
            const authData: AuthData = {
              accessToken: result.authData.accessToken,
              user: result.authData.user
            };
            
            console.log('🔍 handleAuthFromUrl - extracted auth data:', authData);
            
            // Store in our main storage
            this.setAuthData(authData);
            
            // Clean URL
            window.history.replaceState({}, document.title, window.location.pathname);
            
            return authData;
          }
        } else {
          console.log('❌ Failed to fetch auth data from server');
        }
      }
    } catch (error) {
      console.error('❌ Error handling cross-port auth:', error);
    }
    
    return null;
  }
}

// Create default instance
export const crossPortAuth = new CrossPortAuth({
  mainAppPort: 3000,
  doctorAppPort: 3002,
  apiBaseUrl: 'http://localhost:8081/api/v1',
});

// Export the class for custom instances
export { CrossPortAuth };
