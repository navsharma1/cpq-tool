export class Auth {
    constructor(api) {
        this.api = api;
        console.log('Auth initialized with API:', api);
        
        // Check if we're handling a callback
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        console.log('URL parameters:', {
            code: code ? 'present' : 'not present',
            error,
            errorDescription
        });

        if (error) {
            console.error('OAuth error:', error, errorDescription);
            alert(`Login failed: ${errorDescription || error}`);
            return;
        }

        if (code) {
            console.log('Found authorization code, retrieving code verifier...');
            const codeVerifier = sessionStorage.getItem('code_verifier');
            console.log('Retrieved code verifier:', codeVerifier ? 'present' : 'not present');
            
            if (!codeVerifier) {
                console.error('No code verifier found in session storage');
                alert('Login failed: No code verifier in response');
                return;
            }

            // Handle the callback
            this.handleCallback(code, codeVerifier).catch(error => {
                console.error('Callback handling failed:', error);
                alert('Login failed: ' + error.message);
            });
        }

        // Set up login button
        const loginButton = document.getElementById('login-button');
        if (loginButton) {
            console.log('Setting up login button handler');
            loginButton.addEventListener('click', () => this.login());
        }
    }

    async login() {
        try {
            console.log('Starting login process...');
            
            // Get the OAuth URL and code verifier
            const { url, codeVerifier } = await this.api.getAuthUrl();
            console.log('Got auth URL and code verifier:', {
                url: url ? 'present' : 'not present',
                codeVerifier: codeVerifier ? 'present' : 'not present'
            });
            
            if (!url || !codeVerifier) {
                throw new Error('Invalid response from /auth/url');
            }

            // Store the code verifier
            console.log('Storing code verifier in session storage');
            sessionStorage.setItem('code_verifier', codeVerifier);

            // Redirect to Salesforce
            console.log('Redirecting to Salesforce login URL');
            window.location.href = url;
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed: ' + error.message);
        }
    }

    async handleCallback(code, codeVerifier) {
        try {
            console.log('Handling OAuth callback:', {
                code: code ? 'present' : 'not present',
                codeVerifier: codeVerifier ? 'present' : 'not present'
            });

            // Clear the code verifier from storage
            console.log('Clearing code verifier from session storage');
            sessionStorage.removeItem('code_verifier');

            // Exchange the code for tokens
            console.log('Exchanging code for tokens...');
            await this.api.handleCallback(code, codeVerifier);
            console.log('Token exchange successful');

            // Dispatch auth success event
            console.log('Dispatching auth:success event');
            window.dispatchEvent(new Event('auth:success'));

            // Show the app UI
            console.log('Showing app UI');
            document.getElementById('auth-section').classList.add('d-none');
            document.getElementById('app').classList.remove('d-none');

            // Clean up the URL
            console.log('Cleaning up URL');
            window.history.replaceState({}, document.title, '/');
        } catch (error) {
            console.error('Callback handling failed:', error);
            throw error;
        }
    }
}
