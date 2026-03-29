/**
 * QuizMaster Pro | Unified Session Management (v0.3)
 * Logic: Synchronizing Sovereign Biometric and Credential Sessions
 */

export interface SessionData {
    email: string;
    method: 'email' | 'face';
    displayName: string;
}

export const setSovereignSession = (userData: SessionData) => {
    sessionStorage.setItem('isLoggedIn', 'true');
    sessionStorage.setItem('userEmail', userData.email);
    sessionStorage.setItem('authMethod', userData.method);
    sessionStorage.setItem('displayName', userData.displayName);
    sessionStorage.setItem('sessionStart', Date.now().toString());
    
    console.log("Institutional Session Initialized:", sessionStorage.getItem('displayName'));
};

export const clearSovereignSession = () => {
    sessionStorage.removeItem('isLoggedIn');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('authMethod');
    sessionStorage.removeItem('sessionStart');
};

export const checkAuth = () => {
    if (sessionStorage.getItem('isLoggedIn') !== 'true') {
        console.error("Auth Guard Alert: Institutional session invalid or missing. Returning to entry gateway...");
        window.location.href = 'login.html';
    }
};
