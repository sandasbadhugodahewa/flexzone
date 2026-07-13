let currentProductId = null;
let productData = null;

window.addEventListener("load", async () => {
    const params = new URLSearchParams(window.location.search);
    currentProductId = parseInt(params.get("productId"));

    if (!currentProductId) {
        Notiflix.Notify.failure("No product ID provided!", {position: "center-top"});
        setTimeout(() => window.location.href = "admin-products.html", 1500);
        return;
    }
    await loadProduct();
});

async function loadProduct() {
    try {
        Notiflix.Loading.pulse("Loading product...", {svgColor: "#6c5ce7"});

        const res = await fetch(`api/admin/products/${currentProductId}`);
        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
            return;
        }

        productData = data.singleProduct;
        renderProduct(productData);

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

function renderProduct(p) {

    const breadcrumbEl = document.getElementById("pvBreadcrumbTitle");
    if (breadcrumbEl) breadcrumbEl.textContent = p.title;

    const productCardEl = document.getElementById("pvHeroTitle");
    if (productCardEl) productCardEl.textContent = p.title;

    document.title = `${p.title} | FlexZone Admin`;

    const images = p.images || [];
    const mainImgEl = document.getElementById("pvMainImage");
    if (mainImgEl && images.length > 0) {
        mainImgEl.src = "assets/images/productImg/" + images[0];
    }

    const thumbStrip = document.getElementById("pvThumbStrip");
    if (thumbStrip) {
        thumbStrip.innerHTML = images.map((img, i) => `
            <img class="pv-thumb ${i === 0 ? "active" : ""}"
                 src="assets/images/productImg/${img}"
                 alt="thumb ${i + 1}"
                 onclick="switchImage('assets/images/productImg/${img}', this)">`
        ).join("");
    }

    const metaRow = document.getElementById("pvMetaRow");
    if (metaRow) {
        metaRow.innerHTML = `
            <span class="pv-meta-pill"><i class="bi bi-bag"></i> ${p.categoryName || "—"}</span>
            <span class="pv-meta-pill"><i class="bi bi-layers"></i> ${p.subcatName || "—"}</span>
            <span class="pv-meta-pill"><i class="bi bi-award"></i> ${p.brandName || "—"}</span>
            <span class="pv-meta-pill"><i class="bi bi-gender-ambiguous"></i> ${p.genderName || "—"}</span>
            ${buildStatusBadge(p.status)}`;
    }

    //Price range
    const prices = (p.stocks || []).map(s => s.price);
    const minPrice = prices.length ? Math.min(...prices) : 0;
    const maxPrice = prices.length ? Math.max(...prices) : 0;
    const priceEl = document.getElementById("pvPriceRange");
    if (priceEl) {
        priceEl.textContent = prices.length === 0 ? "—"
            : minPrice === maxPrice
                ? `Rs. ${minPrice.toFixed(2)}`
                : `Rs. ${minPrice.toFixed(2)} – Rs. ${maxPrice.toFixed(2)}`;
    }

    const totalStock = (p.stocks || []).reduce((s, r) => s + r.quantity, 0);
    const stockCount = (p.stocks || []).length;
    setEl("pvTotalStock", p.totalStock);
    setEl("pvStockVariants", stockCount);
    setEl("pvSoldCount", p.soldCount || 0);

    const colorHex = p.colorHex || "#ccc";
    setEl("pvInfoColor", `<span class="pv-color-swatch" style="background:${colorHex};"></span>${p.colorValue || "—"}`);
    setEl("pvInfoBrand", p.brandName || "—");
    setEl("pvInfoGender", p.genderName || "—");
    setEl("pvInfoCategory", p.categoryName || "—");
    setEl("pvInfoSubcat", p.subcatName || "—");
    setEl("pvInfoCreated", p.createdAt || "—");
    setEl("pvInfoUpdated", p.updatedAt || "—");

    setEl("pvDescription", p.description || "No description provided.");

    renderStockTable(p.stocks || []);

    const editBtn = document.getElementById("pvEditBtn");
    if (editBtn) editBtn.href = `admin-edit-product.html?productId=${currentProductId}`;
}

function buildStatusBadge(status) {
    const map = {
        "ACTIVE": {cls: "badge-soft-success", label: "Active"},
        "INACTIVE": {cls: "badge-soft-warning", label: "Inactive"},
        "BLOCKED": {cls: "badge-soft-danger", label: "Blocked"},
    };
    const s = map[status] || {cls: "badge-soft-secondary", label: status || "—"};
    return `<span class="badge ${s.cls} ms-1">${s.label}</span>`;
}

function renderStockTable(stocks) {
    const tbody = document.getElementById("pvStockTableBody");
    if (!tbody) return;

    if (stocks.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-3 text-muted">No stock entries</td></tr>`;
        return;
    }

    tbody.innerHTML = stocks.map((s, i) => {
        const qtyClass = s.quantity === 0 ? "pv-qty-zero"
            : s.quantity <= 5 ? "pv-qty-low"
                : "pv-qty-ok";

        const discountBadge = s.discountValue
            ? `<span class="badge badge-soft-success">${s.discountValue}% off</span>`
            : `<span class="text-muted" style="font-size:12px;">—</span>`;

        return `
        <tr>
            <td class="users-meta">${i + 1}</td>
            <td style="font-size:13px;font-weight:600;">${s.sizeValue || "—"}</td>
            <td style="font-size:13px;font-weight:600;">Rs. ${s.price?.toFixed(2) || "—"}</td>
            <td><span class="pv-stock-badge-qty ${qtyClass}">${s.quantity}</span></td>
            <td style="font-size:13px;font-weight:600;">${s.soldCount || 0}</td>
            <td>${discountBadge}</td>
<!--            <td><i class="bi bi-check-circle-fill text-success text-center"></i></td>-->
<!--            <td><i class="bi bi-x-circle-fill text-danger text-center"></i></td>-->
            <td class="text-center">
                ${
                   s.status === "ACTIVE"
                   ? '<i class="bi bi-check-circle-fill text-success"></i>'
                : ''
                }
            </td>

            <td class="text-center">
                ${
                  s.status === "INACTIVE"
                ? '<i class="bi bi-x-circle-fill text-danger"></i>'
                : ''
                  }
                 </td>
            <td>
                <div class="dropdown">
                    <button class="users-action-btn dropdown-toggle" data-bs-toggle="dropdown">
                        <i class="bi bi-three-dots"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end">
                       <li>
                            <a class="dropdown-item" href="#"
                               onclick="toggleStatus(${s.id}, '${s.status}'); return false;">
                                <i class="bi bi-toggle-on me-2"></i>
                                ${s.status === "ACTIVE" ? "Deactivate" : "Activate"}
                            </a>
                       </li>
                    </ul>
                </div>
            </td>
        </tr>`;
    }).join("");
}

function switchImage(src, clickedThumb) {
    const mainImg = document.getElementById("pvMainImage");
    if (mainImg) mainImg.src = src;
    document.querySelectorAll(".pv-thumb").forEach(t => t.classList.remove("active"));
    if (clickedThumb) clickedThumb.classList.add("active");
}

async function toggleProductStatus() {
    if (!productData) return;
    const newStatus = productData.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    Notiflix.Confirm.show(
        "Change Status",
        `Set product to ${newStatus}?`,
        "Confirm",
        "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Updating...", {svgColor: "#6c5ce7"});
                const res = await fetch(`api/admin/products/${currentProductId}/status`, {
                    method: "PUT",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify({status: newStatus})
                });
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, {position: "center-top"});
                    await loadProduct();
                } else {
                    Notiflix.Notify.failure(data.message, {position: "center-top"});
                }
            } catch (e) {
                Notiflix.Notify.failure(e.message, {position: "center-top"});
            } finally {
                Notiflix.Loading.remove();
            }
        }
    );
}

async function deleteProduct() {
    Notiflix.Confirm.show(
        "Delete Product",
        "This will permanently delete the product and all its stock entries. Continue?",
        "Delete",
        "Cancel",
        async () => {
            try {
                Notiflix.Loading.pulse("Deleting...", {svgColor: "#ef4444"});
                const res = await fetch(`api/admin/products/${currentProductId}`, {method: "DELETE"});
                const data = await res.json();
                if (data.status) {
                    Notiflix.Notify.success(data.message, {position: "center-top"});
                    setTimeout(() => window.location.href = "admin-products.html", 1200);
                } else {
                    Notiflix.Notify.failure(data.message, {position: "center-top"});
                }
            } catch (e) {
                Notiflix.Notify.failure(e.message, {position: "center-top"});
            } finally {
                Notiflix.Loading.remove();
            }
        },
        {okButtonBackground: "#ef4444"}
    );
}

function setEl(id, html) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = html;
}