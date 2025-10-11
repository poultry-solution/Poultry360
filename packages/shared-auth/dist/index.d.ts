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
declare class CrossPortAuth {
    private options;
    private storageKey;
    constructor(options: CrossPortAuthOptions);
    setAuthData(authData: AuthData): void;
    getAuthData(): AuthData | null;
    clearAuthData(): void;
    private getCurrentPort;
    private broadcastAuthUpdate;
    navigateToDoctorApp(): Promise<void>;
    navigateToMainApp(): void;
    handleAuthFromUrl(): Promise<AuthData | null>;
}
export declare const crossPortAuth: CrossPortAuth;
export { CrossPortAuth };
