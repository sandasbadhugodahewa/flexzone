function cssVar(name) {
    return getComputedStyle(document.documentElement)
        .getPropertyValue(name).trim();
}

function fmtRs(n) {
    if (n === undefined || n === null) return 'Rs. 0.00';
    return 'Rs. ' + Number(n).toLocaleString('en-US',
        {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function fmtK(n) {
    n = Number(n);
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
    return n.toFixed(0);
}

function pct(current, previous) {
    if (!previous || previous === 0) return null;
    return ((current - previous) / previous * 100).toFixed(1);
}

function applyGrowth(valueId, iconId, textId, growthValue) {
    const iconEl = document.getElementById(iconId);
    const textEl = document.getElementById(textId);
    const wrapEl = iconEl?.closest('.dash-stat-trend');
    if (!textEl) return;

    if (growthValue === null) {
        textEl.textContent = 'N/A';
        return;
    }
    const isPos = parseFloat(growthValue) >= 0;
    if (iconEl) iconEl.className = isPos ? 'bi bi-arrow-up' : 'bi bi-arrow-down';
    if (wrapEl) wrapEl.className = isPos ? 'dash-stat-trend positive' : 'dash-stat-trend negative';
    textEl.textContent = (isPos ? '+' : '') + growthValue + '%';
}

const DASH_CHARTS = {};

function destroyDashChart(id) {
    if (DASH_CHARTS[id]) {
        DASH_CHARTS[id].destroy();
        delete DASH_CHARTS[id];
    }
}

let _monthlyRaw = [];
let _weeklyRaw = [];
let _dailyRaw = [];

window.addEventListener('load', async () => {
    startClock();
    loadAdminName();
    await Promise.all([
        loadStatCards(),
        loadRevenueChart(),
        loadOrderStatusChart(),
        loadRecentTransactions(),
        loadTopProducts(),
        loadTopSpenders(),
        loadPaymentSplitChart()
    ]);
});

function startClock() {
    function tick() {
        const now = new Date();
        const dateEl = document.getElementById('dateDisplay');
        const timeEl = document.getElementById('timeDisplay');
        const tzEl = document.getElementById('tzDisplay');
        if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US',
            {weekday: 'short', year: 'numeric', month: 'short', day: 'numeric'});
        if (timeEl) timeEl.textContent = now.toLocaleTimeString('en-US',
            {hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false});
        if (tzEl) tzEl.textContent = Intl.DateTimeFormat()
            .resolvedOptions().timeZone.replace('_', ' ');
    }

    tick();
    setInterval(tick, 1000);
}

async function loadStatCards() {
    try {
        const [salesRes, custRes, invRes] = await Promise.all([
            fetch('api/admin/reports/sales?period=monthly'),
            fetch('api/admin/reports/customers'),
            fetch('api/admin/reports/inventory')
        ]);

        const salesData = await salesRes.json();
        const custData = await custRes.json();
        const invData = await invRes.json();

        // ── Total Revenue ──────────────────────────
        if (salesData.status) {
            const kpi = salesData.kpi;
            const el = document.getElementById('totalRevenue');
            if (el) el.textContent = fmtRs(kpi.totalRevenue);

            // Growth = compare this month vs last month
            const months = salesData.monthlyChart || [];
            const lastM = months[months.length - 2]?.revenue || 0;
            const thisM = months[months.length - 1]?.revenue || 0;
            applyGrowth('totalRevenue', 'revenueGrowthIcon', 'revenueGrowth', pct(thisM, lastM));

            // ── New Orders (this month's paid orders) ──
            const ordersEl = document.getElementById('newOrders');
            if (ordersEl) ordersEl.textContent = kpi.monthOrders ?? 0;
            const lastMOrders = months[months.length - 2]?.orders || 0;
            const thisMOrders = months[months.length - 1]?.orders || 0;
            applyGrowth('newOrders', 'orderGrowthIcon', 'orderGrowth', pct(thisMOrders, lastMOrders));
        }

        //Total Stock
        if (invData.status) {
            const kpi = invData.kpi;
            const el = document.getElementById('totalStock');
            if (el) el.textContent = Number(kpi.totalUnits || 0).toLocaleString('en-US');
            // growth — if low stock ≥ 10% of total, show negative
            const lowPct = kpi.totalUnits > 0
                ? ((kpi.lowStockCount / kpi.totalUnits) * 100).toFixed(1)
                : 0;
            const stockGrowthEl = document.getElementById('stockGrowth');
            const stockIconEl = document.getElementById('stockGrowthIcon');
            const stockWrapEl = stockIconEl?.closest('.dash-stat-trend');
            if (stockGrowthEl) stockGrowthEl.textContent = `${kpi.outOfStockCount} out of stock`;
            if (stockIconEl) stockIconEl.className = kpi.outOfStockCount > 0
                ? 'bi bi-exclamation-triangle-fill' : 'bi bi-check-circle-fill';
            if (stockWrapEl) stockWrapEl.className = kpi.outOfStockCount > 0
                ? 'dash-stat-trend negative' : 'dash-stat-trend positive';
        }

        //New Users this month
        if (custData.status) {
            const kpi = custData.kpi;
            const el = document.getElementById('newUsers');
            if (el) el.textContent = Number(kpi.newThisMonth ?? 0).toLocaleString('en-US');

            // Growth: compare last 2 months of new customers
            const months = custData.newCustomersPerMonth || [];
            const lastM = months[months.length - 2]?.count || 0;
            const thisM = months[months.length - 1]?.count || 0;
            applyGrowth('newUsers', 'userGrowthIcon', 'userGrowth', pct(thisM, lastM));
        }

    } catch (e) {
        console.error('Stat cards error:', e);
    }
}

async function loadRevenueChart() {
    try {
        const res = await fetch('api/admin/reports/sales?period=monthly');
        const data = await res.json();
        if (!data.status) return;

        // Store all three time series from API
        _monthlyRaw = data.monthlyChart || [];   // { month, revenue, orders }
        _weeklyRaw = data.weeklyChart || [];   // { week, revenue, orders }
        _dailyRaw = data.dailyChart || [];   // { day, revenue, orders }

        renderRevenueChart(_monthlyRaw, 'month');
        wirePeriodTabs();

    } catch (e) {
        console.error('Revenue chart error:', e);
    }
}

function renderRevenueChart(rows, labelKey) {
    const accent      = cssVar('--accent-color')  || '#6c5ce7';
    const success     = cssVar('--success-color') || '#198754';
    const mutedColor  = cssVar('--muted-color')   || '#6b7280';
    const borderColor = cssVar('--border-color')  || '#e5e7eb';

    // Update summary totals
    const totalRevenue = rows.reduce((s, r) => s + (r.revenue || 0), 0);
    const totalOrders  = rows.reduce((s, r) => s + (r.orders  || 0), 0);
    const sumRevEl = document.getElementById('summaryRevenue');
    const sumExpEl = document.getElementById('summaryExpenses');
    if (sumRevEl) sumRevEl.textContent = fmtRs(totalRevenue);
    if (sumExpEl) sumExpEl.textContent = totalOrders + ' orders';

    const labels      = rows.map(r => r[labelKey] || r.month || r.week || r.day);
    const revenueData = rows.map(r => parseFloat((r.revenue || 0).toFixed(2)));
    const ordersData  = rows.map(r => r.orders || 0);

    if (window._revenueApex) {
        window._revenueApex.updateOptions({
            xaxis: { categories: labels }
        }, false, false);
        window._revenueApex.updateSeries([
            { name: 'Revenue (Rs.)', data: revenueData },
            { name: 'Orders',        data: ordersData  }
        ], true);
        return;
    }

    const options = {
        series: [
            { name: 'Revenue (Rs.)', data: revenueData },
            { name: 'Orders',        data: ordersData  }
        ],
        chart: {
            type:       'bar',
            height:     300,
            fontFamily: 'inherit',
            toolbar:    { show: false },
            animations: { enabled: true, easing: 'easeinout', speed: 400 }
        },
        colors: [accent, success],
        plotOptions: {
            bar: { columnWidth: '52%', borderRadius: 4, borderRadiusApplication: 'end' }
        },
        dataLabels: { enabled: false },
        stroke: { show: true, width: 2, colors: ['transparent'] },
        xaxis: {
            categories: labels,
            axisBorder: { show: false },
            axisTicks:  { show: false },
            labels:     { style: { colors: mutedColor, fontSize: '12px' } }
        },

        yaxis: [
            {
                // Left axis — Revenue
                seriesName: 'Revenue (Rs.)',
                labels: {
                    style: { colors: mutedColor, fontSize: '11px' },
                    formatter: v => 'Rs.' + fmtK(v)
                },
                axisBorder: { show: false },
                axisTicks:  { show: false }
            },
            {
                // Right axis — Orders count
                seriesName: 'Orders',
                opposite: true,
                labels: {
                    style: { colors: success, fontSize: '11px' },
                    formatter: v => Math.round(v) + ' ord'
                },
                axisBorder: { show: false },
                axisTicks:  { show: false },
                min: 0,
                forceNiceScale: true
            }
        ],

        grid:    { borderColor, strokeDashArray: 4, xaxis: { lines: { show: false } } },
        legend:  { show: true, position: 'top', horizontalAlign: 'left',
            fontSize: '12px', fontFamily: 'inherit',
            labels: { colors: mutedColor },
            markers: { width: 10, height: 10, radius: 2 } },
        fill:    { opacity: 1 },
        tooltip: {
            shared: true,
            intersect: false,
            y: {
                formatter: (v, { seriesIndex }) =>
                    seriesIndex === 0 ? fmtRs(v) : v + ' orders'
            }
        }
    };

    window._revenueApex = new ApexCharts(
        document.querySelector('#revenueChart'), options);
    window._revenueApex.render();
}

function wirePeriodTabs() {
    document.querySelectorAll('.dash-chart-tab').forEach(tab => {
        tab.addEventListener('click', function () {
            document.querySelectorAll('.dash-chart-tab')
                .forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const period = tab.getAttribute('data-period');
            if (period === 'monthly') renderRevenueChart(_monthlyRaw, 'month');
            if (period === 'weekly') renderRevenueChart(_weeklyRaw, 'week');
            if (period === 'daily') renderRevenueChart(_dailyRaw, 'day');
        });
    });
}

async function loadOrderStatusChart() {
    try {
        const res = await fetch('api/admin/reports/orders?status=all');
        const data = await res.json();
        if (!data.status) return;

        const kpi = data.kpi || {};
        const accent = cssVar('--accent-color') || '#6c5ce7';
        const surf = cssVar('--surface-color') || '#fff';

        // Build slices: Completed, In Transit, Pending, Failed
        const completed = (kpi.totalCompleted || 0) + (kpi.totalDelivered || 0);
        const inTransit = (kpi.totalApproved || 0) + (kpi.totalPacking || 0) + (kpi.totalShipped || 0);
        const pending = kpi.totalPending || 0;
        const failed = kpi.totalBlocked || 0;
        const total = completed + inTransit + pending + failed || 1;

        const slices = [
            {label: 'Completed', value: completed, color: '#16a34a'},
            {label: 'In Transit', value: inTransit, color: accent},
            {label: 'Pending', value: pending, color: '#d97706'},
            {label: 'Failed', value: failed, color: '#dc2626'},
        ].filter(s => s.value > 0);

        // ApexChart donut
        if (window._trafficApex) {
            window._trafficApex.updateOptions({
                series: slices.map(s => s.value),
                labels: slices.map(s => s.label),
                colors: slices.map(s => s.color)
            });
        } else {
            window._trafficApex = new ApexCharts(
                document.querySelector('#trafficChart'), {
                    series: slices.map(s => s.value),
                    chart: {type: 'donut', height: 240, fontFamily: 'inherit'},
                    labels: slices.map(s => s.label),
                    colors: slices.map(s => s.color),
                    plotOptions: {
                        pie: {
                            donut: {
                                size: '72%',
                                labels: {
                                    show: true,
                                    name: {fontSize: '13px', color: '#6b7280'},
                                    value: {
                                        fontSize: '20px', fontWeight: 700,
                                        formatter: v => v
                                    },
                                    total: {
                                        show: true, label: 'Total Orders',
                                        fontSize: '12px', color: '#6b7280',
                                        formatter: w => w.globals.seriesTotals
                                            .reduce((a, b) => a + b, 0)
                                    }
                                }
                            }
                        }
                    },
                    dataLabels: {enabled: false},
                    legend: {show: false},
                    stroke: {width: 3, colors: [surf]}
                });
            window._trafficApex.render();
        }

        // Update legend values
        const legendItems = document.querySelectorAll('.dash-traffic-item');
        const order = ['Completed', 'In Transit', 'Pending', 'Failed'];
        const map = {};
        slices.forEach(s => map[s.label] = s.value);
        legendItems.forEach((item, i) => {
            const lbl = order[i];
            const val = map[lbl] ?? 0;
            const pEl = item.querySelector('.dash-traffic-value');
            if (pEl) pEl.textContent = total > 0
                ? ((val / total) * 100).toFixed(0) + '%' : '0%';
        });

    } catch (e) {
        console.error('Order status chart error:', e);
    }
}

//recentOrders
async function loadRecentTransactions() {
    try {
        const res = await fetch('api/admin/reports/sales?period=monthly');
        const data = await res.json();
        if (!data.status) return;

        const orders = (data.recentOrders || []).slice(0, 5);
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;

        const payMap = {
            PAID: {cls: 'badge-soft-success', label: 'Paid'},
            PENDING: {cls: 'badge-soft-warning', label: 'Pending'},
            BLOCKED: {cls: 'badge-soft-danger', label: 'Failed'},
        };

        tbody.innerHTML = orders.map(o => {
            const s = payMap[o.paymentStatus] || {cls: 'badge-soft-secondary', label: o.paymentStatus || '—'};
            const parts = (o.customer || '—').split(' ');
            const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
            return `
            <tr>
                <td class="fw-medium">
                    <a href="admin-invoice.html?orderId=${o.orderId}"
                       style="color:var(--accent-color);text-decoration:none;font-weight:700;">
                        ${o.orderId}
                    </a>
                </td>
                <td>
                    <div class="table-user">
                        <div class="table-user-avatar"
                             style="width:32px;height:32px;border-radius:50%;
                                    background:color-mix(in srgb,var(--accent-color),transparent 82%);
                                    color:var(--accent-color);display:flex;align-items:center;
                                    justify-content:center;font-size:12px;font-weight:700;
                                    flex-shrink:0;">
                            ${initials}
                        </div>
                        <div>
                            <div class="table-user-name">${o.customer}</div>
                        </div>
                    </div>
                </td>
                <td class="text-muted">${o.date}</td>
                <td class="fw-medium">Rs. ${o.total.toFixed(2)}</td>
                <td><span class="badge ${s.cls}">${s.label}</span></td>
            </tr>`;
        }).join('');

    } catch (e) {
        console.error('Recent transactions error:', e);
    }
}

async function loadTopProducts() {
    try {
        const res = await fetch('api/admin/reports/products');
        const data = await res.json();
        if (!data.status) return;

        const products = (data.bestSelling || []).slice(0, 7);
        const container = document.querySelector('.dash-products');
        if (!container) return;

        container.innerHTML = products.map((p, i) => {
            const colors = ['#6c5ce7', '#16a34a', '#d97706', '#0891b2', '#dc2626'];
            const initials = p.title?.slice(0, 2).toUpperCase() || '??';
            const imgSrc = p.image ? `assets/images/productImg/${p.image}` : '';
            const imgHtml = imgSrc
                ? `<img src="${imgSrc}" 
           style="width:40px;height:40px;border-radius:8px;object-fit:cover;flex-shrink:0;"
           onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">`
                : '';
            const fallback = `
    <div style="width:40px;height:40px;border-radius:8px;flex-shrink:0;
                background:${colors[i % colors.length]}18;color:${colors[i % colors.length]};
                display:${imgSrc ? 'none' : 'flex'};align-items:center;justify-content:center;
                font-size:12px;font-weight:800;">${initials}</div>`;

            return `
            <div class="dash-product-item">
                <div style="width:40px;height:40px;border-radius:8px;flex-shrink:0;
                            background:${colors[i]}18;color:${colors[i]};
                            display:flex;align-items:center;justify-content:center;
                            font-size:12px;font-weight:800;">
                    ${imgHtml}${fallback}
                </div>
                <div class="dash-product-info">
                    <a href="admin-view-product.html?productId=${p.id}" class="dash-product-name"
                       style="font-weight:700;color:var(--accent-color);text-decoration:none;">${p.title}</a>
                    <span class="dash-product-sales">${p.totalQty} sold</span>
                </div>
                <span class="dash-product-revenue">Rs. ${fmtK(p.totalRev)}</span>
            </div>`;
        }).join('');

        if (products.length === 0) {
            container.innerHTML = `<p style="text-align:center;color:#9ca3af;
                padding:20px;font-size:13px;">No sales data yet.</p>`;
        }

    } catch (e) {
        console.error('Top products error:', e);
    }
}

async function loadTopSpenders() {
    try {
        const res = await fetch('api/admin/reports/customers');
        const data = await res.json();
        if (!data.status) return;

        const spenders = (data.topSpenders || []).slice(0, 5);

        const tables = document.querySelectorAll('.table tbody');
        const tbody = tables[1]; // second table = Top Spenders
        if (!tbody) return;

        tbody.innerHTML = spenders.map((c, i) => {
            const parts = (c.name || '').split(' ');
            const initials = ((parts[0]?.[0] || '') + (parts[1]?.[0] || '')).toUpperCase();
            return `
            <tr>
                <td class="fw-semibold" style="color:var(--muted-color);">${i + 1}</td>
                <td>
                    <div class="table-user">
                        <div style="width:32px;height:32px;border-radius:50%;flex-shrink:0;
                                    background:color-mix(in srgb,var(--accent-color),transparent 82%);
                                    color:var(--accent-color);display:flex;align-items:center;
                                    justify-content:center;font-size:12px;font-weight:700;">
                            ${initials}
                        </div>
                        <div>
                           <span style="font-weight:600;font-size:13px;">${c.name || "—"}</span>
                           <small style="display:block;color:var(--muted-color);font-size:11px;"> ${c.email || ""}
                             </small>
                        </div>
                    </div>
                </td>
                <td>${c.orders}</td>
                <td class="fw-semibold">Rs. ${fmtK(c.totalSpent)}</td>
            </tr>`;
        }).join('');

        if (spenders.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;
                color:#9ca3af;padding:20px;font-size:13px;">No data yet.</td></tr>`;
        }

    } catch (e) {
        console.error('Top spenders error:', e);
    }
}

async function loadPaymentSplitChart() {
    try {
        const res = await fetch('api/admin/reports/payments');
        const data = await res.json();
        if (!data.status) return;

        const kpi = data.kpi || {};
        const canvas = document.getElementById('paymentSplitChart');
        if (!canvas) return;

        destroyDashChart('paymentSplit');
        DASH_CHARTS.paymentSplit = new Chart(canvas.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Paid', 'Pending', 'Failed'],
                datasets: [{
                    data: [kpi.paidCount || 0, kpi.pendingCount || 0, kpi.failedCount || 0],
                    backgroundColor: ['#16a34a', '#d97706', '#dc2626'],
                    borderWidth: 0,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '62%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {family: 'inherit', size: 12},
                            color: '#6b7280',
                            padding: 16,
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: ctx => ` ${ctx.label}: ${ctx.raw} orders`
                        }
                    }
                }
            }
        });

    } catch (e) {
        console.error('Payment split chart error:', e);
    }
}

document.addEventListener('themeChanged', () => {
    const accent = cssVar('--accent-color');
    const success = cssVar('--success-color');
    const border = cssVar('--border-color');
    const muted = cssVar('--muted-color');
    const surf = cssVar('--surface-color');

    window._revenueApex?.updateOptions({
        colors: [accent, success],
        grid: {borderColor: border},
        xaxis: {labels: {style: {colors: muted}}},
        yaxis: {labels: {style: {colors: muted}}}
    });

    window._trafficApex?.updateOptions({
        colors: ['#16a34a', accent, '#d97706', '#dc2626'],
        stroke: {colors: [surf]}
    });
});