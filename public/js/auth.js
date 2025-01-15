export class Auth {
    constructor(api) {
        this.api = api;
        this.setupLoginButton();
        this.handleAuthCallback();
    }

    setupLoginButton() {
        const loginButton = document.getElementById('login-button');
        loginButton.addEventListener('click', async () => {
            try {
                const response = await this.api.getAuthUrl();
                console.log('Got auth URL response:', response);
                if (!response.codeVerifier) {
                    throw new Error('No code verifier received from server');
                }
                // Store code verifier in session storage
                sessionStorage.setItem('code_verifier', response.codeVerifier);
                console.log('Stored code verifier:', response.codeVerifier);
                window.location.href = response.url;
            } catch (error) {
                console.error('Failed to get auth URL:', error);
                alert('Failed to start login process. Please try again.');
            }
        });
    }

    async handleAuthCallback() {
        // Check for stored auth code from callback.html
        const code = sessionStorage.getItem('auth_code');
        const error = sessionStorage.getItem('auth_error');
        const errorDescription = sessionStorage.getItem('auth_error_description');
        
        // Clear stored auth values
        sessionStorage.removeItem('auth_code');
        sessionStorage.removeItem('auth_error');
        sessionStorage.removeItem('auth_error_description');
        
        if (error) {
            console.error('Auth error:', error, errorDescription);
            alert(`Authentication error: ${errorDescription}`);
            return;
        }
        
        if (code) {
            try {
                // Get code verifier from session storage
                const codeVerifier = sessionStorage.getItem('code_verifier');
                console.log('Retrieved code verifier:', codeVerifier);
                
                if (!codeVerifier) {
                    throw new Error('No code verifier found');
                }
                
                console.log('Calling handleCallback with code and verifier:', { code, codeVerifier });
                await this.api.handleCallback(code, codeVerifier);
                
                // Remove code verifier from storage
                sessionStorage.removeItem('code_verifier');
                console.log('Authentication successful');
                
                // Show the app
                this.showApp();
            } catch (error) {
                console.error('Auth callback failed:', error);
                alert('Authentication failed. Please try again.');
            }
        } else if (this.api.isAuthenticated()) {
            // Already authenticated
            this.showApp();
        }
    }

    showApp() {
        document.getElementById('auth-section').classList.add('d-none');
        document.getElementById('app').classList.remove('d-none');
        // Dispatch event for app initialization
        window.dispatchEvent(new CustomEvent('auth:success'));
    }
}
