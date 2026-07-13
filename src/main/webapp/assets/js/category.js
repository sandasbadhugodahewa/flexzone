let currentCategoryId = null;
let currentCategoryName = "";
let filteredProducts = [];
let currentPage = 1;
const itemsPerPage = 12;

function initCategoryPage() {
    const params = new URLSearchParams(window.location.search);
    currentCategoryId = params.get("categoryId");
    currentCategoryName = params.get("categoryName") || "Products";

    document.getElementById("categoryTitle").textContent = currentCategoryName;
    document.getElementById("categoryDescription").textContent =
        `Browse our exclusive ${currentCategoryName} collection`;
    document.title = `${currentCategoryName} - fleXZone`;
    document.getElementById("breadcrumb-category").innerHTML =
        `<a href="category.html?categoryId=${currentCategoryId}&categoryName=${encodeURIComponent(currentCategoryName)}">${currentCategoryName}</a>`;

    const style = document.createElement("style");
    style.textContent = `
        #productsContainer.products-grid { grid-template-columns: repeat(4, 1fr); }
        @media (max-width: 991.98px) { #productsContainer.products-grid { grid-template-columns: repeat(2, 1fr); } }
        @media (max-width: 575.98px) { #productsContainer.products-grid { grid-template-columns: repeat(1, 1fr); } }
    `;
    document.head.appendChild(style);

    loadProducts();
}

async function loadProducts() {
    Notiflix.Loading.pulse("Wait...", { clickToClose: false, svgColor: "#0284c7" });

    try {
        const response = await fetch("api/products/loadProducts");

        if (response.ok) {
            const data = await response.json();

            if (data.status) {
                filteredProducts = data.products.filter(
                    p => String(p.categoryId) === String(currentCategoryId)
                );
            } else {
                filteredProducts = [];
            }
        } else {
            Notiflix.Notify.failure("Failed to load products!", { position: "center-top" });
            filteredProducts = [];
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
        filteredProducts = [];
    } finally {
        Notiflix.Loading.remove(500);
    }

    document.getElementById("productCount").textContent = `${filteredProducts.length} Products`;
    currentPage = 1;
    renderPage();
}

function renderPage() {
    const container = document.getElementById("productsContainer");
    const pagination = document.getElementById("paginationContainer");
    container.innerHTML = "";
    pagination.innerHTML = "";

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <i class="bi bi-inbox"></i>
                <h3>No Products Found</h3>
                <p>Try browsing a different category.</p>
                <a href="index.html" class="btn btn-primary" style="margin-top: 20px;">
                    Continue Shopping 
                </a>
            </div>
        `;
        return;
    }

    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const start = (currentPage - 1) * itemsPerPage;
    const pageItems = filteredProducts.slice(start, start + itemsPerPage);

    const IMAGE_BASE_PATH = "assets/images/productImg/"; // ⚠️ confirm this matches your actual upload folder

    container.innerHTML = pageItems.map(product => {
        const mainImg = (product.images && product.images[0]) ? IMAGE_BASE_PATH + product.images[0] : "assets/images/logo/favicon.ico";
        const hoverImg = (product.images && product.images[1]) ? IMAGE_BASE_PATH + product.images[1] : mainImg;
        const inStock = product.quantity > 0;
        const isNew = product.createdAt && (Date.now() - new Date(product.createdAt).getTime()) < (14 * 24 * 60 * 60 * 1000);

        let badge = "";
        if (!inStock) {
            badge = `<span class="badge" style="background:#dc3545;">Out of Stock</span>`;
        } else if (isNew) {
            badge = `<span class="badge" style="background:#28a745;">New</span>`;
        }

        const firstStock = product.stockDTOList && product.stockDTOList.length > 0
            ? product.stockDTOList.find(s => s.quantity > 0) || product.stockDTOList[0]
            : null;
        const stockId = firstStock ? firstStock.stockId : null;

        return `
            <div class="product-item" data-aos="fade-up">
                <div class="product-card">
                    <div class="product-image">
                        <img src="${mainImg}" alt="${product.title}" class="img-fluid main-img" loading="lazy">
                        <img src="${hoverImg}" alt="${product.title}" class="img-fluid hover-img" loading="lazy">
                        <div class="product-tags">${badge}</div>
                        <div class="product-overlay">
                            <button class="btn btn-add-to-cart" onclick="addToCart(${stockId},1)">
                                    <i class="bi bi-bag-plus me-2"></i> Add to Cart
                            </button>
                        </div>
                    </div>
                    <div class="product-info">
                        <span class="product-brand">${product.brandName || ""}</span>
                        <h5 class="product-title">
                            <a href="single-product.html?pId=${product.id}">${product.title}</a>
                        </h5>
                        <div class="product-price">
                            <span class="current-price">Rs.${product.price.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join("");

    if (totalPages <= 1) return;

    for (let i = 0; i <= totalPages + 1; i++) {
        let btn;

        if (i === 0) {
            btn = `<button class="pagination-btn" ${currentPage === 1 ? "disabled" : ""} onclick="goToPage(${currentPage - 1})"><i class="bi bi-chevron-left"></i></button>`;
        } else if (i === totalPages + 1) {
            btn = `<button class="pagination-btn" ${currentPage === totalPages ? "disabled" : ""} onclick="goToPage(${currentPage + 1})"><i class="bi bi-chevron-right"></i></button>`;
        } else {
            btn = `<button class="pagination-btn ${i === currentPage ? "active" : ""}" onclick="goToPage(${i})">${i}</button>`;
        }

        pagination.innerHTML += btn;
    }
}

function goToPage(page) {
    currentPage = page;
    renderPage();
    document.getElementById("category-products").scrollIntoView({ behavior: "smooth" });
}
