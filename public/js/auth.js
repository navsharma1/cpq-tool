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
                const authUrl = await this.api.getAuthUrl();
                window.location.href = authUrl;
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
        
        if (code) {
            try {
                await this.api.handleCallback(code);
                // Remove code from URL
                window.history.replaceState({}, document.title, window.location.pathname);
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
