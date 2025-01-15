import { API } from './api.js';
import { Auth } from './auth.js';

class App {
    constructor() {
        console.log('Initializing App...');
        
        // Initialize API with Worker URL
        const workerUrl = 'https://cpq-api.nav-sharma.workers.dev';
        console.log('Worker URL:', workerUrl);
        
        this.api = new API(workerUrl);
        console.log('API initialized:', this.api);
        
        // Initialize Auth
        this.auth = new Auth(this.api);
        console.log('Auth initialized:', this.auth);
        
        // Store selected account and items
        this.selectedAccount = null;
        this.items = [];
        
        // Initialize after authentication
        window.addEventListener('auth:success', () => this.initialize());
        
        console.log('App initialization complete');
    }

    async initialize() {
        console.log('Initializing app features...');
        
        try {
            // Set up event listeners
            this.setupAccountSearch();
            this.setupPriceBookSelection();
            this.setupSaveQuote();
            
            console.log('App features initialized');
        } catch (error) {
            console.error('Error initializing app:', error);
        }
    }

    setupAccountSearch() {
        const searchInput = document.getElementById('account-search');
        const searchButton = document.getElementById('search-button');
        const resultsContainer = document.getElementById('account-results');

        const performSearch = async () => {
            const term = searchInput.value.trim();
            if (!term) return;

            try {
                console.log('Searching accounts:', term);
                const accounts = await this.api.searchAccounts(term);
                console.log('Search results:', accounts);
                
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
                console.error('Account search failed:', error);
                alert('Failed to search accounts: ' + error.message);
            }
        };

        // Set up event listeners
        searchButton.addEventListener('click', performSearch);
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });
    }

    setupPriceBookSelection() {
        const select = document.getElementById('pricebook-select');
        
        select.addEventListener('change', async () => {
            try {
                const pricebookId = select.value;
                if (!pricebookId) return;
                
                console.log('Loading pricebook entries:', pricebookId);
                const entries = await this.api.getPricebookEntries(pricebookId);
                console.log('Pricebook entries:', entries);
                
                this.updateProductsTable(entries);
            } catch (error) {
                console.error('Failed to load pricebook entries:', error);
                alert('Failed to load products: ' + error.message);
            }
        });

        // Load price books
        this.loadPriceBooks();
    }

    async loadPriceBooks() {
        try {
            console.log('Loading pricebooks...');
            const pricebooks = await this.api.getPricebooks();
            console.log('Pricebooks loaded:', pricebooks);
            
            const select = document.getElementById('pricebook-select');
            select.innerHTML = `
                <option value="">Choose a price book...</option>
                ${pricebooks.map(pb => `
                    <option value="${pb.Id}">${pb.Name}</option>
                `).join('')}
            `;
        } catch (error) {
            console.error('Failed to load pricebooks:', error);
            alert('Failed to load price books: ' + error.message);
        }
    }

    selectAccount(account) {
        console.log('Selected account:', account);
        this.selectedAccount = account;
        
        // Show account details
        document.getElementById('selected-account').innerHTML = `
            <h4>${account.Name}</h4>
            <p>Account ID: ${account.Id}</p>
        `;
        
        // Show quote builder
        document.getElementById('quote-builder').classList.remove('d-none');
    }

    updateProductsTable(entries) {
        const tbody = document.querySelector('#products-table tbody');
        tbody.innerHTML = entries.map(entry => `
            <tr>
                <td>${entry.Product2.Name}</td>
                <td>$${entry.UnitPrice}</td>
                <td>
                    <input type="number" class="form-control quantity-input" 
                           min="0" value="0" data-price="${entry.UnitPrice}">
                </td>
                <td class="line-total">$0.00</td>
                <td>
                    <button class="btn btn-sm btn-danger remove-item">Remove</button>
                </td>
            </tr>
        `).join('');

        // Add event listeners
        this.setupProductEventListeners();
    }

    setupProductEventListeners() {
        const tbody = document.querySelector('#products-table tbody');
        
        // Quantity change
        tbody.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', () => this.updateTotals());
        });
        
        // Remove buttons
        tbody.querySelectorAll('.remove-item').forEach(button => {
            button.addEventListener('click', () => {
                button.closest('tr').remove();
                this.updateTotals();
            });
        });
    }

    updateTotals() {
        let subtotal = 0;
        
        // Calculate line totals and subtotal
        document.querySelectorAll('.quantity-input').forEach(input => {
            const quantity = parseInt(input.value) || 0;
            const price = parseFloat(input.dataset.price);
            const lineTotal = quantity * price;
            
            input.closest('tr').querySelector('.line-total').textContent = 
                `$${lineTotal.toFixed(2)}`;
            
            subtotal += lineTotal;
        });
        
        // Update totals
        const tax = subtotal * 0.08;
        const total = subtotal + tax;
        
        document.getElementById('subtotal').textContent = `$${subtotal.toFixed(2)}`;
        document.getElementById('tax').textContent = `$${tax.toFixed(2)}`;
        document.getElementById('total').textContent = `$${total.toFixed(2)}`;
    }

    setupSaveQuote() {
        document.getElementById('save-quote').addEventListener('click', () => {
            // Collect items
            const items = [];
            document.querySelectorAll('#products-table tbody tr').forEach(row => {
                const quantity = parseInt(row.querySelector('.quantity-input').value);
                if (quantity > 0) {
                    items.push({
                        product: row.cells[0].textContent,
                        unitPrice: parseFloat(row.querySelector('.quantity-input').dataset.price),
                        quantity: quantity
                    });
                }
            });
            
            // Save quote logic would go here
            console.log('Saving quote:', {
                account: this.selectedAccount,
                items: items,
                subtotal: document.getElementById('subtotal').textContent,
                tax: document.getElementById('tax').textContent,
                total: document.getElementById('total').textContent
            });
        });
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.app = new App();
});
