export class API {
    constructor(workerUrl) {
        this.workerUrl = workerUrl;
        this.accessToken = localStorage.getItem('sf_access_token');
        this.instanceUrl = localStorage.getItem('sf_instance_url');
        console.log('API initialized with:', {
            workerUrl,
            hasAccessToken: !!this.accessToken,
            hasInstanceUrl: !!this.instanceUrl
        });
    }

    async request(endpoint, options = {}) {
        const url = `${this.workerUrl}${endpoint}`;
        console.log('Making request to:', url, {
            ...options,
            headers: options.headers || {}
        });

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers,
                }
            });
            console.log('Response status:', response.status);
            
            const contentType = response.headers.get('content-type');
            console.log('Response content type:', contentType);
            
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error(`Expected JSON response, got ${contentType}`);
            }
            
            const responseText = await response.text();
            console.log('Raw response text:', responseText);
            
            if (!responseText) {
                throw new Error('Empty response from server');
            }
            
            let data;
            try {
                data = JSON.parse(responseText);
                console.log('Parsed response data:', data);
            } catch (e) {
                console.error('Failed to parse response as JSON:', e);
                throw new Error(`Invalid JSON response: ${responseText}`);
            }
            
            if (!response.ok) {
                const error = data.error || response.statusText;
                throw new Error(error);
            }
            
            return data;
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    setAuth(accessToken, instanceUrl) {
        console.log('Setting auth tokens');
        this.accessToken = accessToken;
        this.instanceUrl = instanceUrl;
        localStorage.setItem('sf_access_token', accessToken);
        localStorage.setItem('sf_instance_url', instanceUrl);
    }

    clearAuth() {
        console.log('Clearing auth tokens');
        this.accessToken = null;
        this.instanceUrl = null;
        localStorage.removeItem('sf_access_token');
        localStorage.removeItem('sf_instance_url');
    }

    isAuthenticated() {
        return !!this.accessToken;
    }

    async getAuthUrl() {
        console.log('Getting auth URL...');
        try {
            const response = await this.request('/auth/url');
            console.log('Raw auth response:', response);

            // Validate response
            if (!response || typeof response !== 'object') {
                throw new Error('Invalid response format');
            }

            // Validate URL
            if (!response.url || typeof response.url !== 'string') {
                throw new Error('Missing or invalid URL in response');
            }

            // Validate code verifier
            if (!response.codeVerifier || typeof response.codeVerifier !== 'string') {
                throw new Error('Missing or invalid code verifier in response');
            }

            // Create a new object to ensure clean structure
            const result = {
                url: response.url,
                codeVerifier: response.codeVerifier
            };

            console.log('Validated auth response:', {
                hasUrl: !!result.url,
                hasCodeVerifier: !!result.codeVerifier
            });

            return result;
        } catch (error) {
            console.error('Failed to get auth URL:', error);
            throw error;
        }
    }

    async handleCallback(code, codeVerifier) {
        console.log('Handling callback with:', {
            code,
            codeVerifier
        });
        
        if (!code) {
            throw new Error('No authorization code provided');
        }
        
        if (!codeVerifier) {
            throw new Error('No code verifier provided');
        }
        
        const response = await this.request('/auth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, codeVerifier }),
        });
        
        if (!response.access_token || !response.instance_url) {
            throw new Error('Invalid token response');
        }
        
        this.setAuth(response.access_token, response.instance_url);
    }

    async searchAccounts(query) {
        console.log('Searching accounts:', query);
        const response = await this.request(`/search?q=${encodeURIComponent(query)}`);
        console.log('Search results:', response);
        return response;
    }

    async getPricebooks() {
        console.log('Getting pricebooks...');
        const response = await this.request('/pricebooks');
        console.log('Pricebooks:', response);
        return response;
    }

    async getPricebookEntries(pricebookId) {
        console.log('Getting pricebook entries:', pricebookId);
        const response = await this.request(`/pricebook-entries/${pricebookId}`);
        console.log('Pricebook entries:', response);
        return response;
    }
}
