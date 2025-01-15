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

        if (this.accessToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'SF-Instance-URL': this.instanceUrl
            };
        }

        try {
            console.log('Sending request with options:', {
                ...options,
                headers: options.headers || {}
            });
            
            const response = await fetch(url, options);
            console.log('Response status:', response.status);
            
            const contentType = response.headers.get('content-type');
            console.log('Response content type:', contentType);
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Clear invalid tokens
                    this.clearAuth();
                    throw new Error('Authentication required');
                }
                
                let errorMessage;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || `API request failed: ${response.statusText}`;
                } catch (e) {
                    errorMessage = `API request failed: ${response.statusText}`;
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log('Response data:', data);
            return data;
        } catch (error) {
            console.error('Request failed:', error);
            throw error;
        }
    }

    setAuth(accessToken, instanceUrl) {
        console.log('Setting auth tokens:', {
            hasAccessToken: !!accessToken,
            hasInstanceUrl: !!instanceUrl
        });
        
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
        const data = await this.request('/auth/url');
        
        if (!data) {
            throw new Error('No response received from server');
        }
        
        if (!data.url) {
            throw new Error('No URL in response: ' + JSON.stringify(data));
        }
        
        if (!data.codeVerifier) {
            throw new Error('No code verifier in response: ' + JSON.stringify(data));
        }
        
        console.log('Got auth URL response:', {
            url: data.url,
            hasCodeVerifier: !!data.codeVerifier
        });
        
        return data;
    }

    async handleCallback(code, codeVerifier) {
        console.log('Handling callback with:', {
            code,
            hasCodeVerifier: !!codeVerifier
        });
        
        if (!code) {
            throw new Error('No authorization code provided');
        }
        
        if (!codeVerifier) {
            throw new Error('No code verifier provided');
        }
        
        const data = await this.request('/auth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, codeVerifier }),
        });
        
        console.log('Callback response:', {
            hasAccessToken: !!data.access_token,
            hasInstanceUrl: !!data.instance_url
        });
        
        if (!data.access_token || !data.instance_url) {
            throw new Error('Invalid token response: ' + JSON.stringify(data));
        }
        
        this.setAuth(data.access_token, data.instance_url);
    }

    async searchAccounts(query) {
        console.log('Searching accounts:', query);
        const data = await this.request(`/search?q=${encodeURIComponent(query)}`);
        console.log('Search results:', data);
        return data;
    }

    async getPricebooks() {
        console.log('Getting pricebooks...');
        const data = await this.request('/pricebooks');
        console.log('Pricebooks:', data);
        return data;
    }

    async getPricebookEntries(pricebookId) {
        console.log('Getting pricebook entries:', pricebookId);
        const data = await this.request(`/pricebook-entries/${pricebookId}`);
        console.log('Pricebook entries:', data);
        return data;
    }
}
