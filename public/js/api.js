export class API {
    constructor(workerUrl) {
        this.workerUrl = workerUrl;
        this.accessToken = localStorage.getItem('sf_access_token');
        this.instanceUrl = localStorage.getItem('sf_instance_url');
    }

    async request(endpoint, options = {}) {
        const url = `${this.workerUrl}${endpoint}`;
        console.log('Making request to:', url, options);

        if (this.accessToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'SF-Instance-URL': this.instanceUrl
            };
        }

        try {
            const response = await fetch(url, options);
            console.log('Response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Clear invalid tokens
                    this.clearAuth();
                    throw new Error('Authentication required');
                }
                const error = await response.json();
                throw new Error(error.error || `API request failed: ${response.statusText}`);
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
        this.accessToken = accessToken;
        this.instanceUrl = instanceUrl;
        localStorage.setItem('sf_access_token', accessToken);
        localStorage.setItem('sf_instance_url', instanceUrl);
    }

    clearAuth() {
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
        console.log('Got auth URL response:', data);
        return data;
    }

    async handleCallback(code, codeVerifier) {
        console.log('Handling callback with code:', code);
        console.log('Code verifier:', codeVerifier);
        
        const data = await this.request('/auth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code, codeVerifier }),
        });
        
        console.log('Callback response:', data);
        
        if (data.access_token && data.instance_url) {
            this.setAuth(data.access_token, data.instance_url);
        } else {
            throw new Error('Invalid token response');
        }
    }

    async searchAccounts(query) {
        return this.request(`/search?q=${encodeURIComponent(query)}`);
    }

    async getPricebooks() {
        return this.request('/pricebooks');
    }

    async getPricebookEntries(pricebookId) {
        return this.request(`/pricebook-entries/${pricebookId}`);
    }
}
