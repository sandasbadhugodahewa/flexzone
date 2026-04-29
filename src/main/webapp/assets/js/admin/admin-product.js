let currentPage    = 0;
let currentFilter  = "all";
let currentSearch  = "";
let totalCount     = 0;
let searchTimeout  = null;
const PAGE_SIZE    = 8;

window.addEventListener("load", async () => {
    try {
        await loadProductList();
        wireSearchInput();
        wireFilterTabs();
        wireSelectAll();
    } finally {
        Notiflix.Loading.remove();
    }
});
async function loadProductList() {
    Notiflix.Loading.pulse("Loading products...", {
        clickToClose: false,
        svgColor: "#6c5ce7"
    });

    try {
        const url = `api/admin/products?filter=${currentFilter}&search=${encodeURIComponent(currentSearch)}&page=${currentPage}`;
        const res  = await fetch(url);

        if (!res.ok) {
            Notiflix.Notify.failure("Failed to load products!", { position: "center-top" });
            return;
        }

        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            showEmptyState();
            return;
        }

        totalCount = data.totalCount;

        renderTableBody(data.products);
        renderPagination(data.totalCount, data.currentPage);
        updateTabCounts(data);
        updatePaginationInfo(data.totalCount, data.currentPage);
        updateStatCards(data);

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove(500);
    }
}

function renderTableBody(products) {
    const tbody = document.querySelector("table tbody");
    if (!tbody) return;

    if (!products || products.length === 0) {
        showEmptyState();
        return;
    }

    tbody.innerHTML = products.map(p => buildProductRow(p)).join("");
}

function buildProductRow(p) {
    const image = p.image
        ? `assets/images/${p.image}`
        : "assets/images/default.png";

    // Price display
    const priceText = p.minPrice === p.maxPrice
        ? `Rs.${p.minPrice?.toFixed(0)}`
        : `Rs.${p.minPrice?.toFixed(0)}–Rs.${p.maxPrice?.toFixed(0)}`;

    // Stock indicator
    let stockBadgeCls = "";
    let stockLabel    = p.totalStock;
    if (p.totalStock === 0)       { stockBadgeCls = "badge-soft-danger";  stockLabel = "Out"; }
    else if (p.totalStock <= 10)  { stockBadgeCls = "badge-soft-warning"; }
    else                          { stockBadgeCls = "badge-soft-success"; }

    // Status badge
    const statusMap = {
        "ACTIVE":   { cls: "active",   label: "Active" },
        "INACTIVE": { cls: "inactive", label: "Inactive" },
        "BLOCKED":  { cls: "inactive", label: "Blocked" },
    };
    const s = statusMap[p.status] || { cls: "inactive", label: p.status };

    const colorDot = `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;
                           background:${p.colorHex || "#ccc"};border:1px solid rgba(0,0,0,0.1);
                           vertical-align:middle;margin-right:5px;"></span>`;

    return `
    <tr data-product-id="${p.id}">
        <td class="users-meta">#${p.id}</td>
        <td>
            <div class="users-user">
                <div class="users-avatar-wrap">
                    <img src="${image}" alt="${p.title}" class="users-avatar"
                         style="object-fit:cover;border-radius:8px;"
                         onerror="this.src='assets/images/default.png'">
                </div>
                <div class="users-user-info">
                    <a href="admin-view-product.html?productId=${p.id}"
                       class="users-user-name">${p.title}</a>
                    <span class="users-user-email">
                        ${colorDot}${p.colorValue || "—"} &nbsp;·&nbsp; ${p.brandName || "—"}
                    </span>
                </div>
            </div>
        </td>
        <td>
            <span class="users-role user">
                <i class="bi bi-bag"></i> ${p.categoryName || "—"}
            </span>
        </td>
        <td><span class="users-meta">${priceText}</span></td>
        <td>
            <span class="badge ${stockBadgeCls}" style="font-size:12px;font-weight:600;">
                ${p.totalStock === 0 ? "Out of Stock" : p.totalStock}
            </span>
        </td>
        <td class="users-meta">${p.soldCount || 0}</td>
        <td>
            <span class="users-status ${s.cls}">
                <span class="users-status-dot"></span> ${s.label}
            </span>
        </td>
        <td class="users-meta">${p.createdAt || "—"}</td>
        <td>
            <div class="users-actions">
                <a href="admin-view-product.html?productId=${p.id}"
                   class="users-action-btn" title="View Product">
                    <i class="bi bi-eye"></i>
                </a>
                <div class="dropdown">
                    <button class="users-action-btn dropdown-toggle"
                            data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                        <li>
                            <a class="dropdown-item"
                               href="admin-add-product.html?productId=${p.id}">
                                <i class="bi bi-pencil me-2"></i>Edit
                            </a>
                        </li>
                        <li>
                            <a class="dropdown-item" href="#"
                               onclick="toggleStatus(${p.id}, '${p.status}'); return false;">
                                <i class="bi bi-toggle-on me-2"></i>
                                ${p.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </a>
                        </li>
                        <li><hr class="dropdown-divider"></li>
                        <li>
                            <a class="dropdown-item text-danger" href="#"
                               onclick="deleteProduct(${p.id}, '${p.title.replace(/'/g, "\\'")}'); return false;">
                                <i class="bi bi-trash me-2"></i>Delete
                            </a>
                        </li>
                    </ul>
                </div>
            </div>
        </td>
    </tr>`;
}

// ─────────────────────────────────────────────
//  EMPTY STATE
// ─────────────────────────────────────────────
function showEmptyState() {
    const tbody = document.querySelector("table tbody");
    if (!tbody) return;
    tbody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-5">
                <i class="bi bi-box-seam" style="font-size:40px;color:#d1d5db;display:block;margin-bottom:12px;"></i>
                <strong style="font-size:15px;">No products found</strong>
                <p style="font-size:13px;color:#9ca3af;margin-top:4px;">
                    ${currentSearch ? "Try a different search keyword." : "Add your first product to get started."}
                </p>
            </td>
        </tr>`;
}

// ─────────────────────────────────────────────
//  UPDATE STAT CARDS
// ─────────────────────────────────────────────
function updateStatCards(data) {
    setEl("totalProducts",  data.totalAll);
    setEl("activeProducts", data.totalActive);
    setEl("lowStockProducts",       data.totalLowStock);
    setEl("outofStockProducts",     data.totalOutOfStock);
}

// ─────────────────────────────────────────────
//  TAB COUNTS
// ─────────────────────────────────────────────
function updateTabCounts(data) {
    document.querySelectorAll(".users-filter-tab").forEach(tab => {
        const f     = tab.getAttribute("data-filter");
        const count = tab.querySelector(".users-filter-count");
        if (!count) return;
        if (f === "all")        count.textContent = data.totalAll      || 0;
        if (f === "active")     count.textContent = data.totalActive   || 0;
        if (f === "low-stock")  count.textContent = data.totalLowStock || 0;
        if (f === "out-stock")  count.textContent = data.totalOutOfStock || 0;
    });
}

//Pagination
function renderPagination(total, page) {
    const nav        = document.querySelector(".users-pagination nav ul");
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
        if (page > 0) { currentPage--; loadProductList(); }
    });
    nav.appendChild(prevLi);

    // Smart page range
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
        if (page < totalPages - 1) { currentPage++; loadProductList(); }
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
        loadProductList();
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
    const el    = document.querySelector(".users-pagination-info");
    if (!el) return;
    const start = total === 0 ? 0 : page * PAGE_SIZE + 1;
    const end   = Math.min((page + 1) * PAGE_SIZE, total);
    el.innerHTML = `Showing <strong>${start}–${end}</strong> of <strong>${total}</strong> products`;
}

// ─────────────────────────────────────────────
//  FILTER TABS
// ─────────────────────────────────────────────
function wireFilterTabs() {
    document.querySelectorAll(".users-filter-tab").forEach(btn => {
        btn.addEventListener("click", () => {
            document.querySelectorAll(".users-filter-tab")
                .forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            currentFilter = btn.getAttribute("data-filter");
            currentPage   = 0;
            loadProductList();
        });
    });
}

// ─────────────────────────────────────────────
//  SEARCH
// ─────────────────────────────────────────────
function wireSearchInput() {
    const searchInput = document.querySelector(".users-search input");
    if (!searchInput) return;
    searchInput.addEventListener("input", () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentSearch = searchInput.value.trim();
            currentPage   = 0;
            loadProductList();
        }, 400);
    });
}

// ─────────────────────────────────────────────
//  SELECT ALL CHECKBOX
// ─────────────────────────────────────────────
function wireSelectAll() {
    const sa = document.getElementById("selectAll");
    if (!sa) return;
    sa.addEventListener("change", () => {
        document.querySelectorAll(".row-check")
            .forEach(cb => cb.checked = sa.checked);
    });
}

// ─────────────────────────────────────────────
//  ACTIONS
// ─────────────────────────────────────────────
function toggleStatus(productId, currentStatus) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    const label     = newStatus === "ACTIVE" ? "activate" : "deactivate";

    Notiflix.Confirm.show(
        "Change Status",
        `Are you sure you want to ${label} this product?`,
        "Confirm",
        "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Updating...", { svgColor: "#6c5ce7" });
                const res  = await fetch(`api/admin/products/${productId}/status`, {
                    method:  "PUT",
                    headers: { "Content-Type": "application/json" },
                    body:    JSON.stringify({ status: newStatus })
                });
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, { position: "center-top" });
                    await loadProductList();
                } else {
                    Notiflix.Notify.failure(data.message, { position: "center-top" });
                }
            } catch (e) {
                Notiflix.Notify.failure(e.message, { position: "center-top" });
            } finally {
                Notiflix.Loading.remove();
            }
        }
    );
}

function deleteProduct(productId, productTitle) {
    Notiflix.Confirm.show(
        "Delete Product",
        `Delete "${productTitle}"? This cannot be undone.`,
        "Delete",
        "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Deleting...", { svgColor: "#ef4444" });
                const res  = await fetch(`api/admin/products/${productId}`, { method: "DELETE" });
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, { position: "center-top" });
                    await loadProductList();
                } else {
                    Notiflix.Notify.failure(data.message, { position: "center-top" });
                }
            } catch (e) {
                Notiflix.Notify.failure(e.message, { position: "center-top" });
            } finally {
                Notiflix.Loading.remove();
            }
        },
        { okButtonBackground: "#ef4444" }
    );
}

// ─────────────────────────────────────────────
//  HELPER
// ─────────────────────────────────────────────
function setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value ?? "—";
}