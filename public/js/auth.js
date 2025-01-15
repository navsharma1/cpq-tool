class Auth {
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
                // Store code verifier in session storage
                sessionStorage.setItem('code_verifier', response.codeVerifier);
                window.location.href = response.url;
            } catch (error) {
                console.error('Failed to get auth URL:', error);
                alert('Failed to start login process. Please try again.');
            }
        });
    }

    async handleAuthCallback() {
        // Check if we're handling a callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
            console.error('Auth error:', error, errorDescription);
            alert(`Authentication error: ${errorDescription}`);
            return;
        }
        
        if (code) {
            try {
                // Get code verifier from session storage
                const codeVerifier = sessionStorage.getItem('code_verifier');
                if (!codeVerifier) {
                    throw new Error('No code verifier found');
                }
                
                await this.api.handleCallback(code, codeVerifier);
                // Remove code from URL and code verifier from storage
                window.history.replaceState({}, document.title, window.location.pathname);
                sessionStorage.removeItem('code_verifier');
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
