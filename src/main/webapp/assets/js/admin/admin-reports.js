const CHARTS = {};

function destroyChart(id) {
    if (CHARTS[id]) {
        CHARTS[id].destroy();
        delete CHARTS[id];
    }
}

// ─── Chart defaults ───────────────────────────────
const chartDefaults = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: {
            labels: {
                font: {family: "'Plus Jakarta Sans', sans-serif", size: 12},
                color: '#6b7280'
            }
        },
        tooltip: {
            bodyFont: {family: "'Plus Jakarta Sans', sans-serif"},
            titleFont: {family: "'Plus Jakarta Sans', sans-serif", weight: '700'}
        }
    }
};

function accentColor() {
    return getComputedStyle(document.documentElement)
        .getPropertyValue('--accent-color').trim() || '#6c5ce7';
}

// ─── Pagination config ────────────────────────────
const PAGE_SIZE = 15;

// Raw data stores for PDF (all records, not just current page)
const _rawData = {
    sales: [],
    orders: [],
    stockTable: [],
    products: {
        table: [],
        bestSelling: [],
        lowSelling: []
    }
};

// ─── Tab switching ────────────────────────────────
const tabLoaded = {};
window._activeTab = 'sales';

function switchTab(tab, btn) {
    document.querySelectorAll('.rpt-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.rpt-tab-panel').forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + tab).classList.add('active');
    window._activeTab = tab;

    if (!tabLoaded[tab]) {
        tabLoaded[tab] = true;
        ({
            orders: loadOrders, products: loadProducts, inventory: loadInventory,
            customers: loadCustomers, payments: loadPayments, delivery: loadDelivery
        })[tab]?.();
    }
}

// ═══════════════════════════════════════════════════
//  PAGINATION HELPER
//  renders paginated <tbody> + page buttons
// ═══════════════════════════════════════════════════
function paginate(allRows, tbodyId, paginationId, renderRow) {
    let page = 1;
    const totalPages = () => Math.max(1, Math.ceil(allRows.length / PAGE_SIZE));

    function render() {
        const start = (page - 1) * PAGE_SIZE;
        const slice = allRows.slice(start, start + PAGE_SIZE);
        document.getElementById(tbodyId).innerHTML = slice.map(renderRow).join('');

        const pg = document.getElementById(paginationId);
        if (!pg) return;
        const tp = totalPages();
        if (tp <= 1) {
            pg.innerHTML = '';
            return;
        }

        let html = `<div class="rpt-pagination">
            <span class="rpt-pg-info">
                Showing ${start + 1}–${Math.min(start + PAGE_SIZE, allRows.length)} of ${allRows.length}
            </span>
            <div class="rpt-pg-btns">`;

        html += `<button class="rpt-pg-btn" ${page === 1 ? 'disabled' : ''} onclick="pgGo('${paginationId}',${page - 1})">
                     <i class="bi bi-chevron-left"></i></button>`;

        // page number window
        const winStart = Math.max(1, Math.min(page - 2, tp - 4));
        const winEnd = Math.min(tp, winStart + 4);
        if (winStart > 1) html += `<button class="rpt-pg-btn" onclick="pgGo('${paginationId}',1)">1</button>
                                   ${winStart > 2 ? '<span class="rpt-pg-ellipsis">…</span>' : ''}`;
        for (let i = winStart; i <= winEnd; i++) {
            html += `<button class="rpt-pg-btn${i === page ? ' active' : ''}"
                             onclick="pgGo('${paginationId}',${i})">${i}</button>`;
        }
        if (winEnd < tp) html += `${winEnd < tp - 1 ? '<span class="rpt-pg-ellipsis">…</span>' : ''}
                                   <button class="rpt-pg-btn" onclick="pgGo('${paginationId}',${tp})">${tp}</button>`;

        html += `<button class="rpt-pg-btn" ${page === tp ? 'disabled' : ''} onclick="pgGo('${paginationId}',${page + 1})">
                     <i class="bi bi-chevron-right"></i></button>
            </div></div>`;

        pg.innerHTML = html;
    }

    // store render fn so page buttons can call it
    window[`_pgState_${paginationId}`] = {
        allRows, page: () => page, setPage: p => {
            page = p;
            render();
        }
    };
    render();
}

// called by inline onclick from paginate()
function pgGo(paginationId, newPage) {
    window[`_pgState_${paginationId}`]?.setPage(newPage);
}

// ═══════════════════════════════════════════════════
//  1. SALES REPORT
// ═══════════════════════════════════════════════════
async function loadSales() {
    const period = document.getElementById('salesPeriod').value;
    const from = document.getElementById('salesFrom').value;
    const to = document.getElementById('salesTo').value;

    try {
        Notiflix.Loading.pulse('Loading sales...', {svgColor: accentColor()});
        const res = await fetch(`api/admin/reports/sales?period=${period}&from=${from}&to=${to}`);
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const kpi = data.kpi;

        // KPI cards
        document.getElementById('salesKpi').innerHTML = `
            ${kpiCard('Total Revenue', fmt(kpi.totalRevenue), 'bi-graph-up-arrow', '#16a34a', 'All time paid orders')}
            ${kpiCard('Today', fmt(kpi.todaySales), 'bi-sun', '#d97706', kpi.todayOrders + ' orders')}
            ${kpiCard('This Week', fmt(kpi.weekSales), 'bi-calendar-week', '#0891b2', kpi.weekOrders + ' orders')}
            ${kpiCard('This Month', fmt(kpi.monthSales), 'bi-calendar-month', accentColor(), kpi.monthOrders + ' orders')}
            ${kpiCard('This Year', fmt(kpi.yearSales), 'bi-calendar3', '#7c3aed', kpi.yearOrders + ' orders')}
            ${kpiCard('Total Orders', kpi.totalOrders, 'bi-bag-check', '#0d9488', 'All paid')}
            ${kpiCard('Avg Order', fmt(kpi.avgOrderValue), 'bi-calculator', '#2563eb', 'Per paid order')}`;

        // Monthly chart
        destroyChart('salesMonthly');
        CHARTS.salesMonthly = new Chart(
            document.getElementById('salesMonthlyChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.monthlyChart.map(d => d.month),
                    datasets: [{
                        label: 'Revenue (Rs.)',
                        data: data.monthlyChart.map(d => d.revenue),
                        backgroundColor: accentColor() + '22',
                        borderColor: accentColor(),
                        borderWidth: 2, borderRadius: 6, borderSkipped: false
                    }, {
                        label: 'Orders', type: 'line',
                        data: data.monthlyChart.map(d => d.orders),
                        borderColor: '#0891b2', backgroundColor: 'transparent',
                        borderWidth: 2, pointRadius: 4, tension: 0.4, yAxisID: 'y2'
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: {
                            beginAtZero: true, ticks: {callback: v => 'Rs.' + fmtK(v)},
                            grid: {color: '#f1f5f9'}
                        },
                        y2: {position: 'right', beginAtZero: true, grid: {display: false}},
                        x: {grid: {display: false}}
                    }
                }
            });

        // Daily chart
        destroyChart('salesDaily');
        CHARTS.salesDaily = new Chart(
            document.getElementById('salesDailyChart').getContext('2d'), {
                type: 'line',
                data: {
                    labels: data.dailyChart.map(d => d.day),
                    datasets: [{
                        label: 'Revenue',
                        data: data.dailyChart.map(d => d.revenue),
                        borderColor: accentColor(), backgroundColor: accentColor() + '18',
                        borderWidth: 2, fill: true, tension: 0.4, pointRadius: 4
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: {
                            beginAtZero: true, ticks: {callback: v => 'Rs.' + fmtK(v)},
                            grid: {color: '#f1f5f9'}
                        },
                        x: {grid: {display: false}}
                    }
                }
            });

        // Table with pagination
        _rawData.sales = data.recentOrders || [];
        document.getElementById('salesTableCount').textContent =
            `${_rawData.sales.length} paid orders`;

        paginate(_rawData.sales, 'salesTable', 'salesPagination',
            o => `<tr>
                <td><a href="admin-invoice.html?orderId=${o.orderId}"
                       style="font-weight:700;color:var(--accent-color);text-decoration:none;"
                       >${o.orderId}</a></td>
                <td>${o.customer}</td>
                <td>${o.date}</td>
                <td class="text-end fw-semibold">Rs. ${o.total.toFixed(2)}</td>
            </tr>`);

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

// ═══════════════════════════════════════════════════
//  2. ORDERS REPORT
// ═══════════════════════════════════════════════════
async function loadOrders() {
    const status = document.getElementById('orderStatus').value;
    const from = document.getElementById('orderFrom').value;
    const to = document.getElementById('orderTo').value;

    try {
        Notiflix.Loading.pulse('Loading orders...', {svgColor: accentColor()});
        const res = await fetch(`api/admin/reports/orders?status=${status}&dateFrom=${from}&dateTo=${to}`);
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const kpi = data.kpi;
        document.getElementById('ordersKpi').innerHTML = `
            ${kpiCard('Total Orders', kpi.totalAll, 'bi-receipt', accentColor(), '')}
            ${kpiCard('Paid', kpi.totalPaid, 'bi-check-circle', '#16a34a', '')}
            ${kpiCard('Pending', kpi.totalPending, 'bi-clock', '#d97706', '')}
            ${kpiCard('Failed', kpi.totalBlocked, 'bi-x-circle', '#dc2626', '')}
            ${kpiCard('In Delivery', kpi.totalApproved + kpi.totalPacking + kpi.totalShipped,
            'bi-truck', '#0891b2', 'Approved+Packing+Shipped')}
            ${kpiCard('Delivered', kpi.totalDelivered, 'bi-house-check', '#0d9488', '')}
            ${kpiCard('Completed', kpi.totalCompleted, 'bi-award', '#15803d', '')}
            ${kpiCard('Canceled', kpi.totalCanceled, 'bi-slash-circle', '#6b7280', '')}`;

        // Delivery pipeline bar
        destroyChart('deliveryPipeline');
        const dlStatuses = ['Approved', 'Packing', 'Shipped', 'Delivered', 'Completed', 'Canceled'];
        const dlValues = [kpi.totalApproved, kpi.totalPacking, kpi.totalShipped,
            kpi.totalDelivered, kpi.totalCompleted, kpi.totalCanceled];
        const dlColors = ['#2563eb', '#7c3aed', '#0891b2', '#0d9488', '#15803d', '#6b7280'];
        CHARTS.deliveryPipeline = new Chart(
            document.getElementById('deliveryPipelineChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: dlStatuses,
                    datasets: [{
                        label: 'Orders', data: dlValues,
                        backgroundColor: dlColors, borderRadius: 6
                    }]
                },
                options: {
                    ...chartDefaults, indexAxis: 'y',
                    plugins: {...chartDefaults.plugins, legend: {display: false}},
                    scales: {
                        x: {beginAtZero: true, grid: {color: '#f1f5f9'}},
                        y: {grid: {display: false}}
                    }
                }
            });

        // Table with pagination — FIX: correct field names from API
        _rawData.orders = data.allOrders || [];
        document.getElementById('ordersTableCount').textContent =
            `${_rawData.orders.length} orders`;

        paginate(_rawData.orders, 'ordersTable', 'ordersPagination',
            o => `<tr>
                <td><a href="admin-invoice.html?orderId=${o.orderId}"
                       style="font-weight:700;color:var(--accent-color);text-decoration:none;"
                       >${o.orderId}</a></td>
                <td>${o.customer}</td>
                <td>${o.date}</td>
                <td><span class="rpt-badge ${(o.payment || '').toLowerCase()}">${o.payment || '—'}</span></td>
                <td><span class="rpt-badge ${(o.delivery || 'pending').toLowerCase()}">${o.delivery || '—'}</span></td>
                <td class="text-end fw-semibold">Rs. ${o.total.toFixed(2)}</td>
            </tr>`);

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

// ═══════════════════════════════════════════════════
//  3. PRODUCT REPORT
// ═══════════════════════════════════════════════════
async function loadProducts() {
    try {
        Notiflix.Loading.pulse('Loading products...', {svgColor: accentColor()});
        const res = await fetch('api/admin/reports/products');
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const maxQty = data.bestSelling[0]?.totalQty || 1;
        _rawData.products.bestSelling = data.bestSelling || [];
        _rawData.products.lowSelling = data.lowSelling || [];

        document.getElementById('bestSellingList').innerHTML =
            (data.bestSelling || []).map((p, i) => rankRow(p, i, maxQty, true)).join('');

        document.getElementById('lowSellingList').innerHTML =
            (data.lowSelling || []).map((p, i) => rankRow(p, i, maxQty, false)).join('');

        //Out of stock
        const oos = data.outOfStock || [];
        document.getElementById('outOfStockCount').textContent = oos.length + ' products';
        document.getElementById('outOfStockList').innerHTML = oos.length === 0
            ? `<p style="text-align:center;color:var(--muted-color);padding:24px;font-size:13px;">
                <i class="bi bi-check-circle text-success me-2"></i>All products in stock!</p>`
            : oos.map(p => `
                <div style="padding:10px 0;border-bottom:1px solid var(--border-color);
                            display:flex;justify-content:space-between;align-items:center;">
                    <span style="font-size:13px;font-weight:600;">${p.title}</span>
                    <span class="rpt-badge out">Out of Stock</span>
                </div>`).join('');

        destroyChart('category');
        const catColors = ['#6c5ce7', '#0891b2', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0d9488'];
        CHARTS.category = new Chart(
            document.getElementById('categoryChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: data.catSales.map(c => c.category),
                    datasets: [{
                        data: data.catSales.map(c => c.revenue),
                        backgroundColor: catColors, borderWidth: 0, hoverOffset: 6
                    }]
                },
                options: {...chartDefaults, cutout: '55%'}
            });

        // Table with pagination — FIX: correct field names from API
        _rawData.products.table = data.productsTable || [];
        document.getElementById('productTableCount').textContent =
            `${_rawData.products.table.length} products`;

        paginate(_rawData.products.table, 'productTable', 'productsPagination',
            p => `<tr>
                <td><a href="admin-invoice.html?orderId=${p.id}"
                       style="font-weight:700;color:var(--accent-color);text-decoration:none;" >${p.id}</a></td>
                <td>${p.productName}</td>
                <td>${p.category}</td>
                <td>${p.variants}</td>
                <td>${p.stock}</td>
                <td><span class="rpt-badge ${(p.status || '').toLowerCase()}">${p.status || '—'}</span></td>
                <td class="text-end fw-semibold">${p.priceRange}</td>
            </tr>`);

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

// FIX: p.qtySold and p.revenue (not p.totalQty / p.totalRev)
function rankRow(p, i, maxQty, showRevenue) {
    const rankCls = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other';
    // const pct = maxQty > 0 ? ((p.qtySold / maxQty) * 100).toFixed(1) : 0;
    const pct = maxQty > 0 ? ((p.totalQty / maxQty) * 100).toFixed(1) : 0;
    return `
    <div class="rpt-rank-row">
        <div class="rpt-rank-num ${rankCls}">${i + 1}</div>
        <div class="rpt-rank-info">
            <div class="rpt-rank-title">${p.title}</div>
            <div class="rpt-rank-bar-wrap">
                <div class="rpt-rank-bar" style="width:${pct}%;"></div>
            </div>
        </div>
        <div class="rpt-rank-value">
            <div style="font-size:13px;font-weight:700;">${p.totalQty || 0} sold</div>
            ${showRevenue
        ? `<div style="font-size:11px;color:var(--muted-color);">Rs.${fmtK(p.totalRev || 0)}</div>`
        : ''}
        </div>
    </div>`;
}

// ═══════════════════════════════════════════════════
//  4. INVENTORY REPORT
// ═══════════════════════════════════════════════════
async function loadInventory() {
    try {
        Notiflix.Loading.pulse('Loading inventory...', {svgColor: accentColor()});
        const res = await fetch('api/admin/reports/inventory');
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const kpi = data.kpi;
        document.getElementById('inventoryKpi').innerHTML = `
            ${kpiCard('Total Products', kpi.totalProducts, 'bi-bag', accentColor(), 'Active products')}
            ${kpiCard('Total Units', kpi.totalUnits, 'bi-boxes', '#0891b2', 'All variants')}
            ${kpiCard('Low Stock', kpi.lowStockCount, 'bi-exclamation-triangle', '#d97706', '≤ 10 units')}
            ${kpiCard('Out of Stock', kpi.outOfStockCount, 'bi-x-square', '#dc2626', 'Zero quantity')}`;

        // Size chart
        destroyChart('sizeStock');
        CHARTS.sizeStock = new Chart(
            document.getElementById('sizeStockChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.sizeStock.map(d => d.size),
                    datasets: [{
                        label: 'Quantity', data: data.sizeStock.map(d => d.quantity),
                        backgroundColor: accentColor() + 'cc', borderRadius: 6
                    }]
                },
                options: {
                    ...chartDefaults,
                    plugins: {...chartDefaults.plugins, legend: {display: false}},
                    scales: {
                        y: {beginAtZero: true, grid: {color: '#f1f5f9'}},
                        x: {grid: {display: false}}
                    }
                }
            });

        // FIX: API field is colorStock not colorWiseStock
        destroyChart('colorStock');
        CHARTS.colorStock = new Chart(
            document.getElementById('colorStockChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.colorStock.map(d => d.color),
                    datasets: [{
                        label: 'Quantity', data: data.colorStock.map(d => d.quantity),
                        backgroundColor: '#0891b2cc', borderRadius: 6
                    }]
                },
                options: {
                    ...chartDefaults,
                    plugins: {...chartDefaults.plugins, legend: {display: false}},
                    scales: {
                        y: {beginAtZero: true, grid: {color: '#f1f5f9'}},
                        x: {grid: {display: false}}
                    }
                }
            });

        // Stock table with pagination + search/filter
        _rawData.stockTable = data.stockTable || [];
        applyStockFilter();

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

function applyStockFilter() {
    const search = (document.getElementById('stockSearch')?.value || '').toLowerCase();
    const filter = document.getElementById('stockFilter')?.value || 'all';
    const rows = _rawData.stockTable.filter(r =>
        (filter === 'all' || r.stockStatus === filter) &&
        (!search || r.title.toLowerCase().includes(search) ||
            r.category.toLowerCase().includes(search))
    );
    paginate(rows, 'stockTable', 'stockPagination', stockRow);
}

// alias so HTML onchange= still works
function filterStockTable() {
    applyStockFilter();
}

function stockRow(r) {
    return `<tr>
        <td style="font-weight:600;">${r.title}</td>
        <td>${r.category}</td>
        <td>${r.size}</td>
        <td>${r.color}</td>
        <td><span class="rpt-badge ${r.stockStatus.toLowerCase()}">
            ${r.stockStatus === 'OK' ? 'In Stock' : r.stockStatus === 'LOW' ? 'Low Stock' : 'Out of Stock'}
        </span></td>
        <td class="text-center">
            <span style="font-weight:700;color:${
        r.stockStatus === 'OUT' ? '#dc2626' : r.stockStatus === 'LOW' ? '#d97706' : 'var(--heading-color)'};">
                ${r.quantity}
            </span>
        </td>
        <td class="text-end">Rs. ${r.price.toFixed(2)}</td>
    </tr>`;
}

// ═══════════════════════════════════════════════════
//  5. CUSTOMER REPORT
// ═══════════════════════════════════════════════════
async function loadCustomers() {
    try {
        Notiflix.Loading.pulse('Loading customers...', {svgColor: accentColor()});
        const res = await fetch('api/admin/reports/customers');
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const kpi = data.kpi;
        document.getElementById('customersKpi').innerHTML = `
            ${kpiCard('Total Customers', kpi.totalCustomers, 'bi-people', accentColor(), '')}
            ${kpiCard('Active', kpi.activeCustomers, 'bi-person-check', '#16a34a', 'Verified accounts')}
            ${kpiCard('New This Month', kpi.newThisMonth, 'bi-person-add', '#0891b2', '')}`;

        // FIX: API field is newCustomersPerMonth not newChart
        destroyChart('newCustomers');
        CHARTS.newCustomers = new Chart(
            document.getElementById('newCustomersChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.newChart.map(d => d.month),
                    datasets: [{
                        label: 'New Customers',
                        data: data.newChart.map(d => d.count),
                        backgroundColor: accentColor() + '22',
                        borderColor: accentColor(),
                        borderWidth: 2, borderRadius: 6
                    }]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: {beginAtZero: true, grid: {color: '#f1f5f9'}},
                        x: {grid: {display: false}}
                    }
                }
            });

        // FIX: API field is orderCount not orders
        document.getElementById('topSpendersList').innerHTML =
            (data.topSpenders || []).map((c, i) => `
            <div class="rpt-rank-row" xmlns="http://www.w3.org/1999/html">
                <div class="rpt-rank-num ${i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : 'other'}">${i + 1}</div>
                <div class="rpt-rank-info">
                    <div class="rpt-rank-title">${c.name}</div>
                    <br><div style="font-size:11px;color:var(--muted-color);">
                        ${c.email} · ${c.orders} orders
                    </div>
                </div>
                <div class="rpt-rank-value">Rs. ${fmtK(c.totalSpent)}</div>
            </div>`).join('');

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

// ═══════════════════════════════════════════════════
//  6. PAYMENT REPORT
// ═══════════════════════════════════════════════════
async function loadPayments() {
    try {
        Notiflix.Loading.pulse('Loading payments...', {svgColor: accentColor()});
        const res = await fetch('api/admin/reports/payments');
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const kpi = data.kpi;
        document.getElementById('paymentsKpi').innerHTML = `
            ${kpiCard('Paid Revenue', fmt(kpi.paidRevenue), 'bi-cash-stack', '#16a34a', kpi.paidCount + ' orders')}
            ${kpiCard('Pending Amount', fmt(kpi.pendingRevenue), 'bi-hourglass', '#d97706', kpi.pendingCount + ' orders')}
            ${kpiCard('Failed Orders', kpi.failedCount, 'bi-x-circle', '#dc2626', 'Payment failed')}`;

        // Monthly bar chart
        destroyChart('paymentMonthly');
        CHARTS.paymentMonthly = new Chart(
            document.getElementById('paymentMonthlyChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.monthlyPayment.map(d => d.month),
                    datasets: [
                        {
                            label: 'Paid', data: data.monthlyPayment.map(d => d.paid),
                            backgroundColor: '#16a34a88', borderColor: '#16a34a',
                            borderWidth: 1.5, borderRadius: 5
                        },
                        {
                            label: 'Pending', data: data.monthlyPayment.map(d => d.pending),
                            backgroundColor: '#d9770688', borderColor: '#d97706',
                            borderWidth: 1.5, borderRadius: 5
                        }
                    ]
                },
                options: {
                    ...chartDefaults,
                    scales: {
                        y: {
                            beginAtZero: true, ticks: {callback: v => 'Rs.' + fmtK(v)},
                            grid: {color: '#f1f5f9'}
                        },
                        x: {grid: {display: false}}
                    }
                }
            });

        // Doughnut
        destroyChart('paymentSplit');
        CHARTS.paymentSplit = new Chart(
            document.getElementById('paymentSplitChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Paid', 'Pending', 'Failed'],
                    datasets: [{
                        data: [kpi.paidCount, kpi.pendingCount, kpi.failedCount],
                        backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
                        borderWidth: 0, hoverOffset: 8
                    }]
                },
                options: {...chartDefaults, cutout: '60%'}
            });

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

// ═══════════════════════════════════════════════════
//  7. DELIVERY REPORT
// ═══════════════════════════════════════════════════
async function loadDelivery() {
    try {
        Notiflix.Loading.pulse('Loading delivery...', {svgColor: accentColor()});
        const res = await fetch('api/admin/reports/delivery');
        const data = await res.json();
        if (!data.status) {
            Notiflix.Notify.failure(data.message);
            return;
        }

        const kpi = data.kpi;
        document.getElementById('deliveryKpi').innerHTML = `
            ${kpiCard('In Progress', kpi.inProgress, 'bi-hourglass-split', '#2563eb', 'Approved+Packing+Shipped')}
            ${kpiCard('Delivered', kpi.delivered, 'bi-house-check', '#0d9488', '')}
            ${kpiCard('Completed', kpi.completed, 'bi-award', '#15803d', '')}
            ${kpiCard('Canceled', kpi.canceled, 'bi-slash-circle', '#6b7280', '')}
            ${kpiCard('No Status', kpi.noStatus, 'bi-question-circle', '#d97706', 'Paid but unassigned')}`;

        destroyChart('deliveryDist');
        const validSlices = data.distArr.filter(d => d.value > 0);
        CHARTS.deliveryDist = new Chart(
            document.getElementById('deliveryDistChart').getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: validSlices.map(d => d.label),
                    datasets: [{
                        data: validSlices.map(d => d.value),
                        backgroundColor: validSlices.map(d => d.color),
                        borderWidth: 0, hoverOffset: 8
                    }]
                },
                options: {...chartDefaults, cutout: '55%'}
            });

        destroyChart('deliveryType');
        CHARTS.deliveryType = new Chart(
            document.getElementById('deliveryTypeChart').getContext('2d'), {
                type: 'bar',
                data: {
                    labels: data.typeArr.map(d => d.type),
                    datasets: [{
                        label: 'Orders', data: data.typeArr.map(d => d.count),
                        backgroundColor: accentColor() + 'cc', borderRadius: 6
                    }]
                },
                options: {
                    ...chartDefaults,
                    plugins: {...chartDefaults.plugins, legend: {display: false}},
                    scales: {
                        y: {beginAtZero: true, grid: {color: '#f1f5f9'}},
                        x: {grid: {display: false}}
                    }
                }
            });

    } catch (e) {
        Notiflix.Notify.failure(e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

// ═══════════════════════════════════════════════════
//  COMMON PDF EXPORT
//  Uses ALL data (not just current page) for tables.
//  config: { title, kpiId, columns[], rows[], filename }
// ═══════════════════════════════════════════════════
async function exportPDF(tab) {
    try {
        const {jsPDF} = window.jspdf;
        if (!jsPDF) {
            Notiflix.Notify.failure('PDF library not loaded.');
            return;
        }

        Notiflix.Loading.pulse('Generating PDF...', {svgColor: accentColor()});

        const doc = new jsPDF({orientation: 'portrait', unit: 'mm', format: 'a4'});
        const pageW = doc.internal.pageSize.getWidth();
        const now = new Date().toLocaleString('en-US', {dateStyle: 'medium', timeStyle: 'short'});
        const date = new Date().toISOString().slice(0, 10);
        const PURPLE = [108, 92, 231];
        const DARK = [17, 24, 39];
        const GRAY = [107, 114, 128];

        // ── Config per tab ──
        const configs = {
            sales: {
                title: 'Sales Report',
                kpiId: 'salesKpi',
                columns: ['Order ID', 'Customer', 'Date', 'Revenue (Rs.)'],
                rows: _rawData.sales.map(o =>
                    [o.orderId, o.customer, o.date, o.total.toFixed(2)]),
                filename: `flexzone-sales-report-${date}.pdf`
            },
            orders: {
                title: 'Orders Report',
                kpiId: 'ordersKpi',
                columns: ['Order ID', 'Customer', 'Date', 'Payment Status', 'Delivery Status', 'Total (Rs.)'],
                rows: _rawData.orders.map(o =>
                    [o.orderId, o.customer, o.date,
                        o.payment || '—', o.delivery || '—', o.total.toFixed(2)]),
                filename: `flexzone-orders-report-${date}.pdf`
            },
            products: {
                title: 'Product Sales Report',
                kpiId: null,
                columns: ['ID', 'Product', 'Category', 'Size Variants', 'Stock', 'Status', 'Price Range'],
                rows: _rawData.products.table.map(p =>
                    [p.id, p.productName, p.category, p.variants, p.stock, p.status, p.priceRange]),
                filename: `flexzone-products-report-${date}.pdf`
            },
            inventory: {
                title: 'Inventory Report',
                kpiId: 'inventoryKpi',
                columns: ['Product', 'Category', 'Size', 'Color', 'Qty', 'Status', 'Price (Rs.)'],
                rows: _rawData.stockTable.map(r =>
                    [r.title, r.category, r.size, r.color, r.quantity,
                        r.stockStatus === 'OK' ? 'In Stock' : r.stockStatus === 'LOW' ? 'Low Stock' : 'Out of Stock',
                        r.price.toFixed(2)]),
                filename: `flexzone-inventory-report-${date}.pdf`
            }
        };

        const cfg = configs[tab];
        if (!cfg) {
            Notiflix.Notify.info('PDF not available for this tab.');
            return;
        }

        // ── Header band ──
        doc.setFillColor(...PURPLE);
        doc.rect(0, 0, pageW, 32, 'F');

        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('fleXZone', 14, 14);

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(cfg.title, 14, 22);

        doc.setFontSize(9);
        doc.setTextColor(200, 190, 255);
        doc.text(`Generated: ${now}`, pageW - 14, 22, {align: 'right'});

        let y = 42;

        if (cfg.kpiId) {
            const cards = document.querySelectorAll(`#${cfg.kpiId} .rpt-kpi`);
            if (cards.length > 0) {
                doc.setFontSize(9);
                doc.setTextColor(...GRAY);
                doc.setFont('helvetica', 'bold');
                doc.text('KEY METRICS', 14, y);
                y += 4;

                const cardArr = [...cards];
                const colW = (pageW - 28) / 2;

                for (let i = 0; i < cardArr.length; i += 2) {
                    const cards2 = cardArr.slice(i, i + 2);
                    const boxH = 16;

                    cards2.forEach((card, j) => {
                        const lbl = card.querySelector('.rpt-kpi-label')?.textContent?.trim() || '';
                        const val = card.querySelector('.rpt-kpi-value')?.textContent?.trim() || '';
                        const sub = card.querySelector('.rpt-kpi-sub')?.textContent?.trim() || '';
                        const x = 14 + j * (colW + 4);

                        doc.setFillColor(248, 250, 252);
                        doc.roundedRect(x, y, colW, boxH, 2, 2, 'F');
                        doc.setDrawColor(229, 231, 235);
                        doc.roundedRect(x, y, colW, boxH, 2, 2, 'S');

                        doc.setFontSize(8);
                        doc.setTextColor(...GRAY);
                        doc.setFont('helvetica', 'normal');
                        doc.text(lbl, x + 3, y + 5);

                        doc.setFontSize(11);
                        doc.setTextColor(...DARK);
                        doc.setFont('helvetica', 'bold');
                        doc.text(val, x + 3, y + 11);

                        if (sub) {
                            doc.setFontSize(7);
                            doc.setTextColor(...GRAY);
                            doc.setFont('helvetica', 'normal');
                            doc.text(sub, x + 3, y + 15);
                        }
                    });

                    y += boxH + 4;
                    if (y > 250) {
                        doc.addPage();
                        y = 20;
                    }
                }
                y += 4;
            }
        }

        // ── Section divider ──
        doc.setDrawColor(...PURPLE);
        doc.setLineWidth(0.5);
        doc.line(14, y, pageW - 14, y);
        y += 6;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(`Data Table  (${cfg.rows.length} records)`, 14, y);
        y += 5;

        // ── autoTable with ALL rows ──
        if (cfg.rows.length === 0) {
            doc.setFontSize(10);
            doc.setTextColor(...GRAY);
            doc.text('No data available.', 14, y + 8);
        } else {
            doc.autoTable({
                head: [cfg.columns],
                body: cfg.rows,
                startY: y,
                margin: {left: 14, right: 14},
                styles: {
                    fontSize: 8,
                    cellPadding: 3,
                    font: 'helvetica',
                    textColor: DARK
                },
                headStyles: {
                    fillColor: PURPLE,
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 8
                },
                alternateRowStyles: {
                    fillColor: [248, 250, 252]
                },
                columnStyles:
                    tab === 'inventory' || tab === 'orders'
                        ? {0: {cellWidth: 22}}
                        : {},
                didDrawPage: (hookData) => {
                    // Footer on every page
                    const pg = hookData.pageNumber;
                    const tot = doc.internal.getNumberOfPages();
                    doc.setFontSize(7);
                    doc.setTextColor(...GRAY);
                    doc.text(
                        `fleXZone Reports  ·  Page ${pg} of ${tot}`,
                        pageW / 2,
                        doc.internal.pageSize.getHeight() - 8,
                        {align: 'center'}
                    );
                }
            });
        }

        // Products tab: add second table (low selling)
        if (tab === 'products' && _rawData.products.lowSelling.length > 0) {
            doc.addPage();
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(...DARK);
            doc.text('Low Selling Products', 14, 20);
            doc.autoTable({
                head: [['Rank', 'Product', 'Qty Sold', 'Revenue (Rs.)']],
                // body: _rawData.products.lowSelling.map((p, i) =>
                //     [i + 1, p.title, p.qtySold, p.revenue.toFixed(2)]),
                body: _rawData.products.lowSelling.map((p, i) =>
                    [
                        i + 1,
                        p.title,
                        p.totalQty || 0,
                        Number(p.totalRev || 0).toFixed(2)]),
                startY: 26,
                margin: {left: 14, right: 14},
                styles: {fontSize: 8, cellPadding: 3, textColor: DARK},
                headStyles: {fillColor: [217, 119, 6], textColor: [255, 255, 255], fontStyle: 'bold'},
                alternateRowStyles: {fillColor: [248, 250, 252]}
            });
        }

        doc.save(cfg.filename);
        Notiflix.Notify.success('PDF downloaded!', {position: 'center-top'});

    } catch (e) {
        console.error(e);
        Notiflix.Notify.failure('PDF generation failed: ' + e.message);
    } finally {
        Notiflix.Loading.remove();
    }
}

function exportCurrentTab() {
    exportPDF(window._activeTab || 'sales');
}

function printReport() {
    window.print();
}

// ═══════════════════════════════════════════════════
//  UI HELPERS
// ═══════════════════════════════════════════════════
function kpiCard(label, value, icon, color, sub) {
    return `
    <div class="rpt-kpi" style="--kpi-color:${color};">
        <div class="rpt-kpi-icon"><i class="bi ${icon}"></i></div>
        <div class="rpt-kpi-value">${value ?? '—'}</div>
        <div class="rpt-kpi-label">${label}</div>
        ${sub ? `<div class="rpt-kpi-sub">${sub}</div>` : ''}
    </div>`;
}

function fmt(n) {
    if (n === undefined || n === null) return '0';
    return 'Rs. ' + Number(n).toLocaleString('en-US',
        {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function fmtK(n) {
    n = Number(n);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(0);
}