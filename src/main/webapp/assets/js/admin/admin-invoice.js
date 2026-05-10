let currentPage    = 0;
let currentSearch  = "";
let currentStatus  = "all";
let totalCount     = 0;
let searchTimeout  = null;
const PAGE_SIZE    = 8;
window.addEventListener("load", async () => {
    await loadInvoiceList();
    wireSearch();
    wireStatusFilter();
    wireSelectAll();
});
async function loadInvoiceList() {
    Notiflix.Loading.pulse("Loading invoices...", {
        clickToClose: false,
        svgColor: "#6c5ce7"
    });

    try {
        const url  = `api/admin/invoices?search=${encodeURIComponent(currentSearch)}&status=${currentStatus}&page=${currentPage}`;
        const res  = await fetch(url);

        if (!res.ok) {
            Notiflix.Notify.failure("Failed to load invoices!", { position: "center-top" });
            return;
        }

        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            showEmptyState();
            return;
        }
        totalCount = data.totalCount;

        renderTable(data.orders);
        renderPagination(data.totalCount, data.currentPage);
        updatePaginationInfo(data.totalCount, data.currentPage);
        updateStatCards(data);

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove(500);
    }
}

function renderTable(orders) {
    const tbody = document.getElementById("invoiceContainer");
    if (!tbody) return;

    if (!orders || orders.length === 0) {
        showEmptyState();
        return;
    }

    tbody.innerHTML = orders.map(o => buildRow(o)).join("");
}

function buildRow(o) {

    const payMap = {
        "PAID":    { cls: "paid",    icon: "bi-check-circle-fill",  label: "Paid" },
        "PENDING": { cls: "pending", icon: "bi-clock-fill", label: "Pending"  },
        "BLOCKED": { cls: "failed",  icon: "bi-x-circle-fill", label: "Failed" },
    };
    const delMap = {
        "APPROVED":  { cls: "approved",  icon: "bi-check2-circle",  label: "Approved" },
        "PACKING":   { cls: "packing",   icon: "bi-box-seam-fill",  label: "Packing" },
        "SHIPPED":   { cls: "shipped",   icon: "bi-truck", label: "Shipped" },
        "DELIVERED": {cls: "delivered", icon: "bi-house-check", label: "Delivered" },
        "COMPLETED": { cls: "completed", icon: "bi-award-fill", label: "Completed"},
        "CANCELED":  { cls: "canceled",  icon: "bi-slash-circle",   label: "Canceled" },
    };

    const ps = payMap[o.status]         || { cls: "draft", label: o.status || "—" };
    const ds = delMap[o.deliveryStatus] || null;

    return `
    <tr data-order-id="${o.orderId}">

        <td>
            <a href="admin-invoice.html?orderId=${o.orderId}" class="inv-id">
                #${o.orderId}
            </a>
        </td>
        <td>
            <div class="inv-client">

                <div>
                    <span style="font-weight:600;font-size:13px;">${o.customerName || "—"}</span>
                    <small style="display:block;color:var(--muted-color);font-size:11px;">
                        ${o.customerEmail || ""}
                    </small>
                </div>
            </div>
        </td>
        <td class="inv-amount">Rs. ${o.total?.toFixed(2) || "0.00"}</td>
        <td>
           <span class="inv-status ${ps.cls}">
               <i class="bi ${ps.icon || 'bi-circle'} me-1"></i>${ps.label}
           </span>
        </td>
        <td class="inv-date">${o.createdAt || "—"}</td>
        <td class="inv-date">${o.updatedAt || "—"}</td>
        <td> ${ds ? `<span class="inv-status ${ds.cls}">
               <i class="bi ${ds.icon} me-1"></i>${ds.label} </span>`
        : `<span class="inv-status" style="background:#f3f4f6;color:#9ca3af;">—</span>`}
        </td>
        <td>
            <div class="inv-actions">
                <a href="admin-invoice.html?orderId=${o.orderId}"
                   class="inv-action-btn" title="View Invoice">
                    <i class="bi bi-eye"></i>
                </a>
                <div class="dropdown d-inline-block">
                    <button class="inv-action-btn dropdown-toggle"
                            data-bs-toggle="dropdown" title="Change Status">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end"
                        style="font-size:13px;min-width:160px;">
                        <li class="dropdown-header" style="font-size:11px;font-weight:700;
                                text-transform:uppercase;color:var(--muted-color);">
                            Change Status
                        </li>
                        <li><a class="dropdown-item" href="#"
                               onclick="updateStatus('${o.orderId}','APPROVED'); return false;">
                            <i class="bi bi-clock me-2 text-info"></i>Approved
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="updateStatus('${o.orderId}','PACKING'); return false;">
                            <i class="bi bi-box-seam me-2 text-info"></i>Packing
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="updateStatus('${o.orderId}','SHIPPED'); return false;">
                            <i class="bi bi-truck me-2 text-info"></i>Shipped
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="updateStatus('${o.orderId}','DELIVERED'); return false;">
                            <i class="bi bi-house-check me-2 text-primary"></i>Delivered
                        </a></li>
                        <li><a class="dropdown-item" href="#"
                               onclick="updateStatus('${o.orderId}','COMPLETED'); return false;">
                            <i class="bi bi-check-circle me-2 text-success"></i>Completed
                        </a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item text-danger" href="#"
                               onclick="updateStatus('${o.orderId}','CANCELLED'); return false;">
                            <i class="bi bi-x-circle me-2"></i>Cancel
                        </a></li>
                    </ul>
                </div>
            </div>
        </td>
    </tr>`;
}

function showEmptyState() {
    const tbody = document.querySelector("table tbody");
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="8" class="text-center py-5">
                <i class="bi bi-receipt" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:12px;"></i>
                <strong style="font-size:15px;">No invoices found</strong>
                <p style="font-size:13px;color:#9ca3af;margin-top:4px;">
                    ${currentSearch ? "Try a different search keyword." : "No orders have been placed yet."}
                </p>
            </td>
        </tr>`;
    document.querySelector(".inv-pagination nav")?.style && (document.querySelector(".inv-pagination nav").style.display = "none");
}

function updateStatCards(data) {
    // Total Invoices
    const totalEl = document.getElementById("totalInvoices");
    if (totalEl) totalEl.textContent = data.totalAll ?? "—";

    // Paid
    const paidEl = document.getElementById("totalPaid");
    if (paidEl) paidEl.textContent = `Rs. ${(data.totalRevenue || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

    // Pending
    const pendingEl = document.getElementById("totalPending");
    if (pendingEl) pendingEl.textContent = data.totalPending ?? "—";

    // Delivered
    const delivEl = document.getElementById("totalDeliveredItems");
    if (delivEl) delivEl.textContent = data.totalDelivered ?? "—";

    // Update labels too
    const labels = document.querySelectorAll(".inv-stat-label");
    if (labels[1]) labels[1].textContent = "Monthly Revenue";
    if (labels[2]) labels[2].textContent = "Pending";
    if (labels[3]) labels[3].textContent = "Delivered";
}

function renderPagination(total, page) {
    const nav        = document.querySelector(".inv-pagination nav ul");
    if (!nav) return;

    const totalPages = Math.ceil(total / PAGE_SIZE);
    if (totalPages <= 1) {
        nav.closest("nav").style.display = "none";
        return;
    }

    nav.closest("nav").style.display = "";
    nav.innerHTML = "";

    // Prev
    const prevLi = document.createElement("li");
    prevLi.className = `page-item ${page === 0 ? "disabled" : ""}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-left"></i></a>`;
    prevLi.addEventListener("click", e => {
        e.preventDefault();
        if (page > 0) { currentPage--; loadInvoiceList(); }
    });
    nav.appendChild(prevLi);

    let start = Math.max(0, page - 1);
    let end   = Math.min(totalPages - 1, page + 1);

    if (start > 0) {
        addPageItem(nav, 0, page);
        if (start > 1) addDots(nav);
    }
    for (let i = start; i <= end; i++) addPageItem(nav, i, page);
    if (end < totalPages - 1) {
        if (end < totalPages - 2) addDots(nav);
        addPageItem(nav, totalPages - 1, page);
    }

    // Next
    const nextLi = document.createElement("li");
    nextLi.className = `page-item ${page === totalPages - 1 ? "disabled" : ""}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="bi bi-chevron-right"></i></a>`;
    nextLi.addEventListener("click", e => {
        e.preventDefault();
        if (page < totalPages - 1) { currentPage++; loadInvoiceList(); }
    });
    nav.appendChild(nextLi);
}

function addPageItem(nav, i, currentPageIndex) {
    const li = document.createElement("li");
    li.className = `page-item ${i === currentPageIndex ? "active" : ""}`;
    li.innerHTML = `<a class="page-link" href="#">${i + 1}</a>`;
    li.addEventListener("click", e => {
        e.preventDefault();
        currentPage = i;
        loadInvoiceList();
    });
    nav.appendChild(li);
}

function addDots(nav) {
    const li = document.createElement("li");
    li.className = "page-item disabled";
    li.innerHTML = `<a class="page-link" href="#">...</a>`;
    nav.appendChild(li);
}

function updatePaginationInfo(total, page) {
    const el    = document.querySelector(".inv-pagination-info");
    if (!el) return;
    const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const end   = Math.min((page + 1) * PAGE_SIZE, total);
    el.textContent = `Showing ${start} to ${end} of ${total} invoices`;
}

function wireSearch() {
    const input = document.querySelector(".inv-search input");
    if (!input) return;
    input.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = input.value.trim();
            currentPage   = 0;
            loadInvoiceList();
        }, 400);
    });
}

function wireStatusFilter() {
    const sel = document.querySelector(".inv-filter");
    if (!sel) return;
    sel.addEventListener("change", () => {
        currentStatus = sel.value || "all";
        currentPage   = 0;
        loadInvoiceList();
    });
}

function wireSelectAll() {
    const sa = document.querySelector("th .form-check-input");
    if (!sa) return;
    sa.addEventListener("change", () => {
        document.querySelectorAll(".row-check")
            .forEach(cb => cb.checked = sa.checked);
    });
}

async function updateStatus(orderId, newStatus) {
    try {
        Notiflix.Loading.pulse("Updating...", { svgColor: "#6c5ce7" });

        const res  = await fetch(`api/admin/invoices/${orderId}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: newStatus })
        });

        const data = await res.json();

        if (data.status) {
            Notiflix.Notify.success(data.message, { position: "center-top" });
            await loadInvoiceList();
        } else {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}