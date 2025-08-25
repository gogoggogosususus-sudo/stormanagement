// Sales Portal JavaScript
class SalesPortal {
    constructor() {
        this.currentUser = null;
        this.currentSection = 'dashboard';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthStatus();
    }

    setupEventListeners() {
        // Login form
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Navigation
        document.querySelectorAll('[data-section]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.showSection(e.target.dataset.section);
            });
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.handleLogout();
        });

        // Auto-refresh dashboard every 30 seconds
        setInterval(() => {
            if (this.currentSection === 'dashboard' && this.currentUser) {
                this.loadDashboardStats();
            }
        }, 30000);
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.user && (data.user.role === 'Sales' || data.user.role === 'Backend')) {
                    this.currentUser = data.user;
                    this.showMainApp();
                }
            }
        } catch (error) {
            console.error('Auth check failed:', error);
        }
    }

    async handleLogin() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');

        try {
            const response = await fetch('/api/sales/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                this.showMainApp();
                errorDiv.classList.add('hidden');
            } else {
                errorDiv.textContent = data.error || 'Login failed';
                errorDiv.classList.remove('hidden');
            }
        } catch (error) {
            errorDiv.textContent = 'Network error. Please try again.';
            errorDiv.classList.remove('hidden');
        }
    }

    async handleLogout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST',
                credentials: 'include'
            });
        } catch (error) {
            console.error('Logout error:', error);
        }
        
        this.currentUser = null;
        this.showLoginScreen();
    }

    showLoginScreen() {
        document.getElementById('loginScreen').style.display = 'flex';
        document.getElementById('mainApp').style.display = 'none';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    }

    showMainApp() {
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('mainApp').style.display = 'block';
        document.getElementById('userInfo').textContent = `${this.currentUser.username} (${this.currentUser.role})`;
        this.showSection('dashboard');
    }

    showSection(section) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active');

        // Show section
        document.querySelectorAll('.content-section').forEach(sec => {
            sec.classList.add('hidden');
        });
        document.getElementById(`${section}Section`).classList.remove('hidden');

        this.currentSection = section;

        // Load section data
        switch (section) {
            case 'dashboard':
                this.loadDashboardStats();
                break;
            case 'orders':
                this.loadOrders();
                break;
            case 'maintenance':
                this.loadMaintenance();
                break;
            case 'history':
                this.loadHistory();
                break;
        }
    }

    async loadDashboardStats() {
        try {
            const response = await fetch('/api/sales/stats', {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.updateDashboardStats(data);
            }
        } catch (error) {
            console.error('Failed to load dashboard stats:', error);
        }
    }

    updateDashboardStats(data) {
        const { orders, maintenance, financial } = data;

        // Update main stats
        document.getElementById('totalOrders').textContent = orders.total;
        document.getElementById('pendingOrders').textContent = orders.pending;
        document.getElementById('totalMaintenance').textContent = maintenance.total;
        document.getElementById('totalRevenue').textContent = `NPR ${financial.total_revenue.toLocaleString()}`;

        // Update financial overview
        document.getElementById('dashTotalRevenue').textContent = `NPR ${financial.total_revenue.toLocaleString()}`;
        document.getElementById('paidRevenue').textContent = `NPR ${financial.paid_revenue.toLocaleString()}`;
        document.getElementById('pendingRevenue').textContent = `NPR ${financial.pending_revenue.toLocaleString()}`;

        // Update order status distribution
        const total = orders.total || 1; // Avoid division by zero
        const pendingPercent = Math.round((orders.pending / total) * 100);
        const processingPercent = Math.round((orders.processing / total) * 100);
        const deliveredPercent = Math.round((orders.delivered / total) * 100);

        document.getElementById('pendingOrdersPercent').textContent = `${pendingPercent}%`;
        document.getElementById('pendingOrdersBar').style.width = `${pendingPercent}%`;
        
        document.getElementById('processingOrdersPercent').textContent = `${processingPercent}%`;
        document.getElementById('processingOrdersBar').style.width = `${processingPercent}%`;
        
        document.getElementById('deliveredOrdersPercent').textContent = `${deliveredPercent}%`;
        document.getElementById('deliveredOrdersBar').style.width = `${deliveredPercent}%`;
    }

    async loadOrders() {
        const status = document.getElementById('orderStatusFilter').value;
        const availability = document.getElementById('orderAvailabilityFilter').value;
        const customer = document.getElementById('orderCustomerFilter').value;

        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);
        if (availability !== 'all') params.append('availability', availability);
        if (customer) params.append('customer', customer);

        try {
            const response = await fetch(`/api/sales/orders?${params}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.displayOrders(data.orders);
            }
        } catch (error) {
            console.error('Failed to load orders:', error);
        }
    }

    displayOrders(orders) {
        const tbody = document.getElementById('ordersTableBody');
        tbody.innerHTML = '';

        orders.forEach(order => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${order.id}</td>
                <td>
                    <strong>${order.customer_name}</strong><br>
                    <small class="text-muted">${order.customer_phone}</small>
                </td>
                <td class="currency-display">NPR ${order.total_value.toLocaleString()}</td>
                <td>
                    <span class="status-badge ${this.getPaymentStatusClass(order.payment_status)}">
                        ${order.payment_status}
                    </span>
                    ${order.payment_method === 'Partial' ? `<br><small>Paid: NPR ${order.paid_amount}</small>` : ''}
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(order.status)}">
                        ${order.status}
                    </span>
                </td>
                <td>
                    <span class="availability-indicator ${order.product_available ? 'available' : 'unavailable'}"></span>
                    ${order.product_available ? 'Available' : 'Unavailable'}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary btn-action" onclick="salesPortal.editOrder(${order.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadMaintenance() {
        const status = document.getElementById('maintenanceStatusFilter').value;
        const priority = document.getElementById('maintenancePriorityFilter').value;
        const customer = document.getElementById('maintenanceCustomerFilter').value;

        const params = new URLSearchParams();
        if (status !== 'all') params.append('status', status);
        if (priority !== 'all') params.append('priority', priority);
        if (customer) params.append('customer', customer);

        try {
            const response = await fetch(`/api/sales/maintenance?${params}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.displayMaintenance(data.maintenance_requests);
            }
        } catch (error) {
            console.error('Failed to load maintenance:', error);
        }
    }

    displayMaintenance(requests) {
        const tbody = document.getElementById('maintenanceTableBody');
        tbody.innerHTML = '';

        requests.forEach(request => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>#${request.id}</td>
                <td>
                    <strong>${request.customer_name}</strong><br>
                    <small class="text-muted">${request.customer_phone}</small>
                </td>
                <td>
                    <strong>${request.device_type}</strong><br>
                    <small class="text-muted">${request.problem_description.substring(0, 50)}...</small>
                </td>
                <td>
                    <span class="status-badge priority-${request.priority.toLowerCase()}">
                        ${request.priority}
                    </span>
                </td>
                <td>
                    <span class="status-badge ${this.getStatusClass(request.status)}">
                        ${request.status}
                    </span>
                </td>
                <td>
                    ${request.rider_name || 'Not Assigned'}
                </td>
                <td>
                    <button class="btn btn-sm btn-primary btn-action" onclick="salesPortal.editMaintenance(${request.id})">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async loadHistory() {
        const type = document.getElementById('historyTypeFilter').value;
        const limit = document.getElementById('historyLimitFilter').value;

        const params = new URLSearchParams();
        if (type !== 'all') params.append('type', type);
        params.append('limit', limit);

        try {
            const response = await fetch(`/api/sales/history?${params}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.displayHistory(data.history);
            }
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    }

    displayHistory(history) {
        const tbody = document.getElementById('historyTableBody');
        tbody.innerHTML = '';

        history.forEach(job => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>
                    <span class="badge ${job.job_type === 'order' ? 'bg-primary' : 'bg-warning'}">
                        ${job.job_type.toUpperCase()}
                    </span>
                </td>
                <td>${job.job_title}</td>
                <td>
                    <strong>${job.customer_name}</strong><br>
                    <small class="text-muted">${job.customer_phone || 'N/A'}</small>
                </td>
                <td>${new Date(job.completion_date).toLocaleDateString()}</td>
                <td>
                    <span class="status-badge ${this.getStatusClass(job.final_status)}">
                        ${job.final_status}
                    </span>
                </td>
                <td>
                    ${job.total_amount ? `NPR ${job.total_amount.toLocaleString()}` : 'N/A'}
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    async editOrder(orderId) {
        try {
            const response = await fetch(`/api/orders/${orderId}`, {
                credentials: 'include'
            });

            if (response.ok) {
                const data = await response.json();
                this.showOrderEditModal(data.order);
            }
        } catch (error) {
            console.error('Failed to load order:', error);
        }
    }

    showOrderEditModal(order) {
        const modalHtml = `
            <div class="modal fade" id="editOrderModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Order #${order.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="editOrderForm">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Customer Name</label>
                                            <input type="text" class="form-control" value="${order.customer_name}" readonly>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Phone</label>
                                            <input type="text" class="form-control" value="${order.customer_phone}" readonly>
                                        </div>
                                    </div>
                                </div>
                                
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="mb-3">
                                            <label class="form-label">Status</label>
                                            <select class="form-select" id="orderStatus">
                                                <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                                       
(Content truncated due to size limit. Use page ranges or line ranges to read remaining content)
