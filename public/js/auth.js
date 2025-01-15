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
                console.log('Login button clicked');
                console.log('API instance:', this.api);
                console.log('Worker URL:', this.api.workerUrl);
                
                const response = await this.api.getAuthUrl();
                console.log('Got auth URL response:', response);
                
                if (!response) {
                    throw new Error('No response from server');
                }
                
                if (!response.url) {
                    throw new Error('No URL in response: ' + JSON.stringify(response));
                }
                
                if (!response.codeVerifier) {
                    throw new Error('No code verifier in response: ' + JSON.stringify(response));
                }
                
                // Store code verifier in session storage
                sessionStorage.setItem('code_verifier', response.codeVerifier);
                console.log('Stored code verifier:', response.codeVerifier);
                
                // Redirect to Salesforce login
                console.log('Redirecting to:', response.url);
                window.location.href = response.url;
            } catch (error) {
                console.error('Login failed:', error);
                console.error('Error details:', {
                    message: error.message,
                    stack: error.stack,
                    name: error.name
                });
                alert('Failed to start login process: ' + error.message);
            }
        });
    }

    async handleAuthCallback() {
        try {
            // Check for stored auth code from callback.html
            const code = sessionStorage.getItem('auth_code');
            const error = sessionStorage.getItem('auth_error');
            const errorDescription = sessionStorage.getItem('auth_error_description');
            
            console.log('Callback state:', {
                code,
                error,
                errorDescription,
                hasCodeVerifier: !!sessionStorage.getItem('code_verifier')
            });
            
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
                        throw new Error('No code verifier found in session storage');
                    }
                    
                    console.log('Calling handleCallback with:', {
                        code,
                        codeVerifier,
                        hasApi: !!this.api
                    });
                    
                    await this.api.handleCallback(code, codeVerifier);
                    
                    // Remove code verifier from storage
                    sessionStorage.removeItem('code_verifier');
                    console.log('Authentication successful');
                    
                    // Show the app
                    this.showApp();
                } catch (error) {
                    console.error('Callback failed:', error);
                    console.error('Error details:', {
                        message: error.message,
                        stack: error.stack,
                        name: error.name
                    });
                    alert('Authentication failed: ' + error.message);
                }
            } else if (this.api.isAuthenticated()) {
                // Already authenticated
                this.showApp();
            }
        } catch (error) {
            console.error('Auth callback error:', error);
            console.error('Error details:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            alert('Authentication error: ' + error.message);
        }
    }

    showApp() {
        document.getElementById('auth-section').classList.add('d-none');
        document.getElementById('app').classList.remove('d-none');
        // Dispatch event for app initialization
        window.dispatchEvent(new CustomEvent('auth:success'));
    }
}
