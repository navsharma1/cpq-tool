class API {
    constructor(workerUrl) {
        this.workerUrl = workerUrl;
        this.accessToken = localStorage.getItem('sf_access_token');
        this.instanceUrl = localStorage.getItem('sf_instance_url');
    }

    async request(endpoint, options = {}) {
        if (this.accessToken) {
            options.headers = {
                ...options.headers,
                'Authorization': `Bearer ${this.accessToken}`,
                'SF-Instance-URL': this.instanceUrl
            };
        }

        const response = await fetch(`${this.workerUrl}${endpoint}`, options);
        
        if (!response.ok) {
            if (response.status === 401) {
                // Clear invalid tokens
                this.clearAuth();
                throw new Error('Authentication required');
            }
            const error = await response.json();
            throw new Error(error.error || `API request failed: ${response.statusText}`);
        }

        return response.json();
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
        const response = await this.request('/auth/url');
        return response;
    }

    async handleCallback(code, codeVerifier) {
        const response = await this.request('/auth/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ code, codeVerifier })
        });
        
        this.setAuth(response.access_token, response.instance_url);
        return response;
    }

    async searchAccounts(term) {
        return this.request(`/api/accounts/search?term=${encodeURIComponent(term)}`);
    }

    async getPriceBooks() {
        return this.request('/api/pricebooks');
    }

    async getPriceBookEntries(priceBookId) {
        return this.request(`/api/pricebookentries?pricebookId=${encodeURIComponent(priceBookId)}`);
    }
}
