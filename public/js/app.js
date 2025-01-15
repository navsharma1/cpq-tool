import { API } from './api.js';
import { Auth } from './auth.js';

class App {
    constructor() {
        // Initialize API with Worker URL
        const workerUrl = window.location.hostname === 'localhost' 
            ? 'http://localhost:8787'
            : 'https://cpq-api.nav-sharma.workers.dev';
        this.api = new API(workerUrl);
        
        // Initialize Auth
        this.auth = new Auth(this.api);
        
        // Store selected account and items
        this.selectedAccount = null;
        this.items = [];
        
        // Initialize after authentication
        window.addEventListener('auth:success', () => this.initialize());
    }

    async initialize() {
        // Set up event listeners
        this.setupAccountSearch();
        this.setupPriceBookSelection();
        this.setupSaveQuote();
    }

    setupAccountSearch() {
        const searchInput = document.getElementById('account-search');
        const searchButton = document.getElementById('search-button');
        const resultsContainer = document.getElementById('account-results');

        const performSearch = async () => {
            const term = searchInput.value.trim();
            if (!term) return;

            try {
                const accounts = await this.api.searchAccounts(term);
                resultsContainer.innerHTML = accounts.map(account => `
                    <button class="list-group-item list-group-item-action" data-account-id="${account.Id}">
                        ${account.Name}
                    </button>
                `).join('');

                // Add click handlers to results
                resultsContainer.querySelectorAll('button').forEach(button => {
                    button.addEventListener('click', () => this.selectAccount(accounts.find(a => a.Id === button.dataset.accountId)));
                });
            } catch (error) {
                console.error('Failed to search accounts:', error);
                alert('Failed to search accounts. Please try again.');
            }
        };

        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    async selectAccount(account) {
        this.selectedAccount = account;
        
        // Update UI
        document.getElementById('selected-account').innerHTML = `
            Selected Account: <strong>${account.Name}</strong>
        `;
        
        // Show quote builder
        document.getElementById('quote-builder').classList.remove('d-none');
        
        // Load price books
        await this.loadPriceBooks();
    }

    async loadPriceBooks() {
        try {
            const priceBooks = await this.api.getPriceBooks();
            const select = document.getElementById('pricebook-select');
            
            select.innerHTML = `
                <option value="">Choose a price book...</option>
                ${priceBooks.map(pb => `
                    <option value="${pb.Id}">${pb.Name}</option>
                `).join('')}
            `;
            
            select.addEventListener('change', () => this.loadPriceBookEntries(select.value));
        } catch (error) {
            console.error('Failed to load price books:', error);
            alert('Failed to load price books. Please try again.');
        }
    }

    async loadPriceBookEntries(priceBookId) {
        if (!priceBookId) return;
        
        try {
            const entries = await this.api.getPriceBookEntries(priceBookId);
            const tbody = document.querySelector('#products-table tbody');
            
            tbody.innerHTML = entries.map(entry => `
                <tr>
                    <td>${entry.Product2.Name}</td>
                    <td>$${entry.UnitPrice}</td>
                    <td>
                        <input type="number" class="form-control quantity-input" 
                               data-product-id="${entry.Product2Id}"
                               data-price="${entry.UnitPrice}"
                               value="0" min="0">
                    </td>
                    <td class="line-total">$0.00</td>
                    <td>
                        <button class="btn btn-sm btn-danger remove-item">Remove</button>
                    </td>
                </tr>
            `).join('');
            
            // Add event listeners
            tbody.querySelectorAll('.quantity-input').forEach(input => {
                input.addEventListener('change', () => this.updateTotals());
            });
            
            tbody.querySelectorAll('.remove-item').forEach(button => {
                button.addEventListener('click', (e) => {
                    e.target.closest('tr').querySelector('.quantity-input').value = 0;
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
            
            input.closest('tr').querySelector('.line-total').textContent = `$${lineTotal.toFixed(2)}`;
            subtotal += lineTotal;
        });
        
        // Update totals
        const tax = subtotal * 0.08; // 8% tax rate
        const total = subtotal + tax;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    setupPriceBookSelection() {
        // Event handlers are set up in loadPriceBooks()
    }

    setupSaveQuote() {
        document.getElementById('save-quote').addEventListener('click', async () => {
            if (!this.selectedAccount) {
                alert('Please select an account first.');
                return;
            }
            
            // Gather line items
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
            
            try {
                // TODO: Implement quote saving
                alert('Quote saving not yet implemented');
            } catch (error) {
                console.error('Failed to save quote:', error);
                alert('Failed to save quote. Please try again.');
            }
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});
