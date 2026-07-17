const DISCOUNT_PERCENT = 10;
const AS_PAGE_SIZE     = 12;

let asCurrentPage   = 0;
let asTotalCount    = 0;
let asAllData       = {};
let asActiveFilters = {};
let asCurrentView   = "grid";
let asSearchTimeout = null;

window.addEventListener("load", async () => {
    try {
        Notiflix.Loading.pulse("Loading...", { clickToClose: false, svgColor: "#0284c7" });
        await loadAllData();
    } finally {
        Notiflix.Loading.remove();
    }
});

async function loadAllData() {
    try {
        const res  = await fetch("api/advanced-search/all-data");
        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            return;
        }

        asAllData    = data;
        asTotalCount = data.allProductCount;

        buildSidebar(data);

        // ── NEW: check for keyword in URL ──
        const params  = new URLSearchParams(window.location.search);
        const keyword = params.get("q");

        if (keyword) {

            const toolbarInput = document.getElementById("asKeyword");
            if (toolbarInput) toolbarInput.value = keyword;

            asActiveFilters.keyword = keyword;
            await runSearch();
            buildPagination(asTotalCount);
            updateActiveFilterTags();
        } else {
            renderProducts(data.productList);
            buildPagination(asTotalCount);
        }

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    }
}

function buildSidebar(data) {
    const sidebarHTML = buildSidebarHTML(data);
    document.getElementById("asSidebarContent").innerHTML   = sidebarHTML;
    document.getElementById("asDrawerContent").innerHTML    = sidebarHTML;

    const maxP = data.maxPrice || 50000;
    document.querySelectorAll(".as-price-slider").forEach(el => {
        el.max   = maxP;
        el.value = maxP;
    });
    document.querySelectorAll(".as-price-max-val").forEach(el => {
        el.textContent = "Rs. " + maxP.toLocaleString();
    });
}

function buildSidebarHTML(data) {
    // ── Brands ──
    const brandsHTML = (data.brandList || []).map(b => `
        <div class="as-check-item">
            <input type="checkbox" id="brand_${b.id}" value="${b.id}"
                   onchange="onFilterChange('brandId', ${b.id}, this.checked)">
            <label for="brand_${b.id}">${b.name}</label>
        </div>`).join("");

    // ── Colors ──
    const colorsHTML = (data.colorList || []).map(c => `
        <div class="as-color-swatch"
             style="background:${c.hexCode || "#ccc"};"
             title="${c.value}"
             onclick="onColorSelect(this, ${c.id}, '${c.value}')">
            <span class="as-check-icon"><i class="bi bi-check-lg"></i></span>
        </div>`).join("");

    // ── Sizes ──
    const sizesHTML = (data.sizeList || []).map(s => `
        <button class="as-size-btn"
                onclick="onSizeSelect(this, ${s.id})">
            ${s.value}
        </button>`).join("");

    // ── Genders ──
    const gendersHTML = (data.genderList || []).map(g => `
        <div class="as-check-item">
            <input type="checkbox" id="gender_${g.id}" value="${g.id}"
                   onchange="onFilterChange('genderId', ${g.id}, this.checked)">
            <label for="gender_${g.id}">${g.name}</label>
        </div>`).join("");

    return `

 
        <!-- Price Range -->
        <div class="as-filter-card">
            <h6>Price Range</h6>
            <div class="as-price-display">
                <span>Rs. 0</span>
                <span class="as-price-max-val">Rs. 50,000</span>
            </div>
            <input type="range" class="as-price-slider" min="0" max="50000"
                   style="width:100%; accent-color:var(--accent-color);"
                   oninput="onPriceSlider(this)">
        </div>
 
        <!-- Brands -->
        <div class="as-filter-card">
            <h6>Brand <span class="clear-link" onclick="clearFilter('brandId')">Clear</span></h6>
            <div class="as-brand-search" style="margin-bottom:8px;">
                <input type="text" placeholder="Search brands..."
                       oninput="filterBrandCheckboxes(this.value)">
                <i class="bi bi-search"></i>
            </div>
            <div id="asBrandList">${brandsHTML}</div>
        </div>
 
        <!-- Colors -->
        <div class="as-filter-card">
            <h6>Color <span class="clear-link" onclick="clearColorFilter()">Clear</span></h6>
            <div class="as-color-grid">${colorsHTML}</div>
        </div>
 
        <!-- Sizes -->
        <div class="as-filter-card">
            <h6>Size <span class="clear-link" onclick="clearSizeFilter()">Clear</span></h6>
            <div class="as-size-grid">${sizesHTML}</div>
        </div>
 
        <!-- Gender -->
        ${gendersHTML.length ? `
        <div class="as-filter-card">
            <h6>Gender <span class="clear-link" onclick="clearFilter('genderId')">Clear</span></h6>
            ${gendersHTML}
        </div>` : ""}
 
        <!-- Clear all -->
        <button class="as-clear-btn" onclick="clearAllFilters()">
            <i class="bi bi-x-circle"></i> Clear All Filters
        </button>`;
}

function onFilterChange(key, value, checked) {
    if (checked) {
        // For single-select filters (brand, gender): uncheck others
        document.querySelectorAll(`input[id^="${key.replace("Id","")}_"]`).forEach(el => {
            if (parseInt(el.value) !== value) el.checked = false;
        });
        asActiveFilters[key] = value;
    } else {
        delete asActiveFilters[key];
    }
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function onColorSelect(el, colorId, colorValue) {
    const isActive = el.classList.contains("active");
    document.querySelectorAll(".as-color-swatch").forEach(s => s.classList.remove("active"));
    if (!isActive) {
        el.classList.add("active");
        asActiveFilters.colorId    = colorId;
        asActiveFilters.colorLabel = colorValue;
    } else {
        delete asActiveFilters.colorId;
        delete asActiveFilters.colorLabel;
    }
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function onSizeSelect(btn, sizeId) {
    const isActive = btn.classList.contains("active");
    document.querySelectorAll(".as-size-btn").forEach(b => b.classList.remove("active"));
    if (!isActive) {
        btn.classList.add("active");
        asActiveFilters.sizeId    = sizeId;
        asActiveFilters.sizeLabel = btn.textContent.trim();
    } else {
        delete asActiveFilters.sizeId;
        delete asActiveFilters.sizeLabel;
    }
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function onPriceSlider(el) {
    const val = parseInt(el.value);
    document.querySelectorAll(".as-price-max-val").forEach(e => {
        e.textContent = "Rs. " + val.toLocaleString();
    });
    asActiveFilters.priceMin = 0;
    asActiveFilters.priceMax = val;
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function onKeywordInput(val) {
    clearTimeout(asSearchTimeout);
    asSearchTimeout = setTimeout(() => {
        if (val.trim()) {
            asActiveFilters.keyword = val.trim();
        } else {
            delete asActiveFilters.keyword;
        }
        asCurrentPage = 0;
        runSearch();
        updateActiveFilterTags();
    }, 400); // 400ms debounce
}

function filterBrandCheckboxes(keyword) {
    document.querySelectorAll("#asBrandList .as-check-item").forEach(item => {
        const label = item.querySelector("label").textContent.toLowerCase();
        item.style.display = label.includes(keyword.toLowerCase()) ? "" : "none";
    });
}

function clearFilter(key) {
    delete asActiveFilters[key];
    const prefix = key.replace("Id", "");
    document.querySelectorAll(`input[id^="${prefix}_"]`).forEach(el => el.checked = false);
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function clearColorFilter() {
    delete asActiveFilters.colorId;
    delete asActiveFilters.colorLabel;
    document.querySelectorAll(".as-color-swatch").forEach(s => s.classList.remove("active"));
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function clearSizeFilter() {
    delete asActiveFilters.sizeId;
    delete asActiveFilters.sizeLabel;
    document.querySelectorAll(".as-size-btn").forEach(b => b.classList.remove("active"));
    asCurrentPage = 0;
    runSearch();
    updateActiveFilterTags();
}

function clearAllFilters() {
    asActiveFilters = {};
    asCurrentPage   = 0;
    buildSidebar(asAllData);
    document.getElementById("asKeyword").value = "";
    runSearch();
    updateActiveFilterTags();
}

async function runSearch() {
    const grid = document.getElementById("asProductGrid");
    grid.classList.add("loading");

    try {
        const payload = {
            ...asActiveFilters,
            firstResult: asCurrentPage * AS_PAGE_SIZE,
            sortValue:   document.getElementById("asSortSelect")?.value || "default"
        };

        const res  = await fetch("api/advanced-search/search-data", {
            method:  "POST",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify(payload)
        });

        const data = await res.json();

        if (data.status) {
            asTotalCount = data.allProductCount;
            renderProducts(data.productList);
            buildPagination(asTotalCount);
            document.getElementById("asProductCount").textContent = asTotalCount;
        } else {
            showNoResults();
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        grid.classList.remove("loading");
    }
}

function renderProducts(products) {
    const grid = document.getElementById("asProductGrid");
    document.getElementById("asProductCount").textContent = asTotalCount;

    if (!products || products.length === 0) {
        showNoResults();
        return;
    }

    const isListView = asCurrentView === "list";
    grid.className   = `row g-3 as-product-grid${isListView ? " list-view" : ""}`;
    grid.innerHTML   = products.map((p, i) => buildProductCard(p, i)).join("");
}

function buildProductCard(p, index) {
    const image = p.images && p.images.length > 0
        ? "assets/images/productImg/" + p.images[0]
        : "assets/images/default.png";

    const image2 = p.images && p.images.length > 1
        ? "assets/images/productImg/" + p.images[1]
        : image;

    const discountAmount = p.price * (DISCOUNT_PERCENT / 100);
    const oldPrice       = (p.price + discountAmount).toFixed(2);

    const colClass = asCurrentView === "list"
        ? "col-12 as-product-col"
        : "col-md-6 col-lg-4 as-product-col";

    const delay = (index % 3) * 100;

    const fullStars = Math.floor(p.averageRating);
    let stars = "";
    for (let i = 1; i <= 5; i++) {
        if (i <= fullStars) {
            stars += `<i class="bi bi-star-fill"></i>`;
        } else {
            stars += `<i class="bi bi-star"></i>`;
        }
    }

    return `
    <div class="${colClass}" data-aos="fade-up" data-aos-delay="${delay}">
        <div class="product-card" style="${asCurrentView === "list" ? "display:flex;" : ""}">
            <div class="product-image" style="${asCurrentView === "list" ? "width:200px;flex-shrink:0;" : ""}">
                <img src="${image}"  alt="${p.title}" class="img-fluid default-image" loading="lazy">
                <img src="${image2}" alt="${p.title}" class="img-fluid hover-image"   loading="lazy">
                <div class="product-tags">
                    <span class="badge bg-accent">${p.categoryName || "New"}</span>
                </div>
                <div class="product-actions">
                    <button class="btn-wishlist" onclick="addToWishList(${p.stockId})"
                            type="button" aria-label="Wishlist">
                        <i class="bi bi-heart"></i>
                    </button>
                    <a class="btn-quickview" href="single-product.html?pId=${p.productId}"
                       aria-label="View">
                        <i class="bi bi-eye"></i>
                    </a>
                </div>
            </div>
            <div class="product-info" style="${asCurrentView === "list" ? "flex:1;" : ""}">
                <h3 class="product-title">
                    <a href="single-product.html?pId=${p.productId}">${p.title}</a>
                </h3>
                 <span class="as-price-display">Size: ${p.sizeValue}</span>
                <div class="product-price">
                    <span class="current-price">Rs.${p.price}.00</span>
                    <span class="original-price">Rs.${oldPrice}</span>
                </div>
                <div class="product-rating">
                           ${stars}

                    <span>(${p.totalReviews})</span>
                </div>
                ${asCurrentView === "list" ? `
                <div class="mt-3 d-flex gap-2">
                    <button onclick="addToCart(${p.stockId}, 1)"
                            style="background:var(--accent-color);color:#fff;border:none;
                                   border-radius:8px;padding:8px 18px;font-weight:600;
                                   font-size:13px;cursor:pointer;">
                        <i class="bi bi-cart-plus me-1"></i>Add to Cart
                    </button>
                    <a href="single-product.html?pId=${p.productId}"
                       class="btn btn-sm btn-outline-secondary" style="border-radius:8px;font-size:13px;">
                        View Details
                    </a>
                </div>` : ""}
            </div>
        </div>
    </div>`;
}

// ─────────────────────────────────────────────
//  ACTIVE FILTER TAGS
// ─────────────────────────────────────────────
function updateActiveFilterTags() {
    const container = document.getElementById("asActiveFilters");
    let html = "";

    if (asActiveFilters.keyword) {
        html += makeTag(`"${asActiveFilters.keyword}"`, `delete asActiveFilters.keyword; document.getElementById('asKeywordInput').value=''; asCurrentPage=0; runSearch(); updateActiveFilterTags();`);
    }
    if (asActiveFilters.brandId) {
        const brand = (asAllData.brandList || []).find(b => b.id === asActiveFilters.brandId);
        if (brand) html += makeTag(`Brand: ${brand.name}`, `clearFilter('brandId')`);
    }
    if (asActiveFilters.colorLabel) {
        html += makeTag(`Color: ${asActiveFilters.colorLabel}`, `clearColorFilter()`);
    }
    if (asActiveFilters.sizeLabel) {
        html += makeTag(`Size: ${asActiveFilters.sizeLabel}`, `clearSizeFilter()`);
    }
    if (asActiveFilters.genderId) {
        const g = (asAllData.genderList || []).find(g => g.id === asActiveFilters.genderId);
        if (g) html += makeTag(`Gender: ${g.name}`, `clearFilter('genderId')`);
    }
    if (asActiveFilters.priceMax) {
        html += makeTag(`Max: Rs.${asActiveFilters.priceMax.toLocaleString()}`, `delete asActiveFilters.priceMin; delete asActiveFilters.priceMax; asCurrentPage=0; runSearch(); updateActiveFilterTags();`);
    }

    container.innerHTML = html;
}

function makeTag(label, onClear) {
    return `<span class="as-filter-tag">${label}
        <button onclick="${onClear}"><i class="bi bi-x"></i></button>
    </span>`;
}

function buildPagination(totalCount) {
    const container  = document.getElementById("asPaginationContainer");
    const totalPages = Math.ceil(totalCount / AS_PAGE_SIZE);

    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }

    container.style.display = "";
    container.innerHTML = `
        <button type="button" class="btn-prev"><i class="bi bi-chevron-left"></i></button>
        <div class="page-numbers"></div>
        <button type="button" class="btn-next"><i class="bi bi-chevron-right"></i></button>`;

    const pageNumbers = container.querySelector(".page-numbers");
    const prevBtn     = container.querySelector(".btn-prev");
    const nextBtn     = container.querySelector(".btn-next");

    prevBtn.disabled = asCurrentPage === 0;
    nextBtn.disabled = asCurrentPage === totalPages - 1;

    prevBtn.onclick = () => { asCurrentPage--; runSearch(); buildPagination(asTotalCount); };
    nextBtn.onclick = () => { asCurrentPage++; runSearch(); buildPagination(asTotalCount); };

    let start = Math.max(0, asCurrentPage - 1);
    let end   = Math.min(totalPages - 1, asCurrentPage + 1);

    if (start > 0) {
        addPageBtn(0);
        if (start > 1) addDots();
    }

    for (let i = start; i <= end; i++) addPageBtn(i);

    if (end < totalPages - 1) {
        if (end < totalPages - 2) addDots();
        addPageBtn(totalPages - 1);
    }

    function addPageBtn(i) {
        const btn       = document.createElement("button");
        btn.type        = "button";
        btn.textContent = i + 1;
        if (i === asCurrentPage) btn.classList.add("active");
        btn.onclick = () => { asCurrentPage = i; runSearch(); buildPagination(asTotalCount); };
        pageNumbers.appendChild(btn);
    }

    function addDots() {
        const s       = document.createElement("span");
        s.textContent = "...";
        pageNumbers.appendChild(s);
    }
}

function setAsView(view) {
    asCurrentView = view;
    document.getElementById("asGridBtn").classList.toggle("active", view === "grid");
    document.getElementById("asListBtn").classList.toggle("active", view === "list");
    renderProducts(null); // re-render with current page (trigger empty check)
    runSearch();
}

function showNoResults() {
    document.getElementById("asProductCount").textContent = 0;
    document.getElementById("asProductGrid").innerHTML = `
        <div class="col-12">
            <div class="as-no-results">
                <div class="as-icon-wrap">
                    <i class="bi bi-search" style="font-size:34px;color:var(--accent-color);"></i>
                </div>
                <h5 class="fw-bold mt-3 mb-2">No products found</h5>
                <p class="text-muted mb-4">Try adjusting your filters or search terms.</p>
                <button onclick="clearAllFilters()"
                        style="background:var(--accent-color);color:#fff;border:none;
                               padding:10px 24px;border-radius:10px;font-weight:600;
                               font-size:14px;cursor:pointer;">
                    Clear All Filters
                </button>
            </div>
        </div>`;
    document.getElementById("asPaginationContainer").style.display = "none";
}

function openAsDrawer() {
    document.getElementById("asDrawer").classList.add("open");
    document.getElementById("asOverlay").classList.add("open");
    document.body.style.overflow = "hidden";
}

function closeAsDrawer() {
    document.getElementById("asDrawer").classList.remove("open");
    document.getElementById("asOverlay").classList.remove("open");
    document.body.style.overflow = "";
}