class App {
    constructor() {
        // Initialize API with Worker URL
        this.api = new API('https://cpq-api.nav-sharma.workers.dev');
        // Initialize Auth
        this.auth = new Auth(this.api);
        
        // Store selected account and items
        this.selectedAccount = null;
        this.items = [];
        
        // Initialize after authentication
        window.addEventListener('auth:success', () => this.initialize());
    }

    initialize() {
        // Set up event listeners
        document.getElementById('search-button').addEventListener('click', () => this.searchAccounts());
        document.getElementById('account-search').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchAccounts();
        });
        document.getElementById('pricebook-select').addEventListener('change', (e) => this.loadPriceBookEntries(e.target.value));
        document.getElementById('save-quote').addEventListener('click', () => this.saveQuote());
        
        // Load price books
        this.loadPriceBooks();
    }

    async searchAccounts() {
        const searchInput = document.getElementById('account-search');
        const resultsContainer = document.getElementById('account-results');
        
        try {
            const response = await this.api.searchAccounts(searchInput.value);
            const accounts = response.searchRecords || [];
            
            resultsContainer.innerHTML = accounts.map(account => `
                <a href="#" class="list-group-item list-group-item-action account-item" data-account='${JSON.stringify(account)}'>
                    <div class="d-flex justify-content-between align-items-center">
                        <h6 class="mb-1">${account.Name}</h6>
                    </div>
                    <small>${[account.BillingStreet, account.BillingCity, account.BillingState].filter(Boolean).join(', ')}</small>
                </a>
            `).join('');

            // Add click handlers
            resultsContainer.querySelectorAll('.account-item').forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.selectAccount(JSON.parse(item.dataset.account));
                });
            });
        } catch (error) {
            console.error('Failed to search accounts:', error);
            alert('Failed to search accounts. Please try again.');
        }
    }

    selectAccount(account) {
        this.selectedAccount = account;
        
        // Update UI
        document.getElementById('selected-account').innerHTML = `
            <h5>${account.Name}</h5>
            <p class="mb-0">${[account.BillingStreet, account.BillingCity, account.BillingState, account.BillingPostalCode].filter(Boolean).join(', ')}</p>
        `;
        
        // Show quote builder
        document.getElementById('quote-builder').classList.remove('d-none');
    }

    async loadPriceBooks() {
        try {
            const response = await this.api.getPriceBooks();
            const select = document.getElementById('pricebook-select');
            
            select.innerHTML = '<option value="">Choose a price book...</option>' +
                response.records.map(book => 
                    `<option value="${book.Id}">${book.Name}</option>`
                ).join('');
        } catch (error) {
            console.error('Failed to load price books:', error);
            alert('Failed to load price books. Please try again.');
        }
    }

    async loadPriceBookEntries(priceBookId) {
        if (!priceBookId) return;
        
        try {
            const response = await this.api.getPriceBookEntries(priceBookId);
            const tbody = document.querySelector('#products-table tbody');
            
            tbody.innerHTML = response.records.map(entry => `
                <tr>
                    <td>${entry.Product2.Name}</td>
                    <td>$${entry.UnitPrice.toFixed(2)}</td>
                    <td>
                        <input type="number" class="form-control quantity-input" 
                               data-product-id="${entry.Id}"
                               data-price="${entry.UnitPrice}"
                               min="0" value="0">
                    </td>
                    <td>$0.00</td>
                    <td>
                        <button class="btn btn-sm btn-danger">Remove</button>
                    </td>
                </tr>
            `).join('');

            // Add event listeners for quantity changes
            tbody.querySelectorAll('.quantity-input').forEach(input => {
                input.addEventListener('change', () => this.updateTotals());
            });

            // Add event listeners for remove buttons
            tbody.querySelectorAll('.btn-danger').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.target.closest('tr').remove();
                    this.updateTotals();
                });
            });
        } catch (error) {
            console.error('Failed to load price book entries:', error);
            alert('Failed to load products. Please try again.');
        }
    }

    updateTotals() {
        let subtotal = 0;
        
        // Calculate line totals and subtotal
        document.querySelectorAll('.quantity-input').forEach(input => {
            const quantity = parseInt(input.value) || 0;
            const price = parseFloat(input.dataset.price);
            const lineTotal = quantity * price;
            
            // Update line total
            input.closest('tr').querySelector('td:nth-child(4)').textContent = 
                `$${lineTotal.toFixed(2)}`;
            
            subtotal += lineTotal;
        });

        // Update totals
        const tax = subtotal * 0.08; // 8% tax
        const total = subtotal + tax;

        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    async saveQuote() {
        if (!this.selectedAccount) {
            alert('Please select an account first.');
            return;
        }

        const items = [];
        document.querySelectorAll('.quantity-input').forEach(input => {
            const quantity = parseInt(input.value) || 0;
            if (quantity > 0) {
                items.push({
                    productId: input.dataset.productId,
                    quantity: quantity,
                    unitPrice: parseFloat(input.dataset.price)
                });
            }
        });

        if (items.length === 0) {
            alert('Please add at least one product to the quote.');
            return;
        }

        // TODO: Implement quote saving logic
        console.log('Saving quote:', {
            accountId: this.selectedAccount.Id,
            items: items
        });
        
        alert('Quote saved successfully!');
    }
}

// Initialize app
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
