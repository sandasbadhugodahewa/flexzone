
const DISCOUNT_PERCENT = 10;

async function loadProducts() {
    try {
        let container = document.getElementById("productContainer");
        container.innerHTML = "";

        const response = await fetch("api/products/loadProducts");

        if (response.ok) {
            const data = await response.json();
            if (data.status) {

                data.products.forEach(product => {

                    let image = product.images && product.images.length > 0
                        ? "assets/images/" + product.images[0]
                        : "assets/images/default.png";

                    const discountAmount = product.price * (DISCOUNT_PERCENT / 100);
                    const oldPrice = (product.price + discountAmount).toFixed(2);

                    // first available stock id
                    const firstStock = product.stockDTOList && product.stockDTOList.length > 0
                        ? product.stockDTOList.find(s => s.quantity > 0) || product.stockDTOList[0]
                        : null;
                    const stockId = firstStock ? firstStock.stockId : null;

                    let card = `
                <div class="col-md-6 col-lg-3 product-item isotope-item filter-clothing">
                    <div class="product-card">
                        <div class="product-image">
                            <span class="badge">New</span>
                            <img src="${image}" alt="Product" class="img-fluid main-img">
                            <img src="${image}" alt="Product Hover" class="img-fluid hover-img">
                            <div class="product-overlay">
                                <a class="btn btn-cart" onclick="addToCart(${stockId},1);"><i class="bi bi-cart-plus"></i> Add to Cart</a>
                                <div class="product-actions">
                                    <a class="action-btn" onclick="addToWishList(${stockId});"><i class="bi bi-heart"></i></a>
                                    <a href="single-product.html?pId=${product.id}" class="action-btn"><i class="bi bi-eye"></i></a>
                                    <a href="#" class="action-btn"><i class="bi bi-arrow-left-right"></i></a>
                                </div>
                            </div>
                        </div>
                        <div class="product-info">
                            <h5 class="product-title">
                                <a href="single-product.html?pId=${product.id}">${product.title}</a>
                            </h5>
                            <div class="product-price">
                                <span class="current-price">Rs.${product.price}.00</span>
                                <span class="old-price">Rs.${oldPrice}.00</span>
                            </div>
                            <div class="product-rating">
                                <i class="bi bi-star-fill"></i>
                                <i class="bi bi-star-fill"></i>
                                <i class="bi bi-star-fill"></i>
                                <i class="bi bi-star-fill"></i>
                                <i class="bi bi-star-half"></i>
                                <span>(24)</span>
                            </div>
                        </div>
                    </div>
                </div>`;
                    container.innerHTML += card;
                });

            } else {
                Notiflix.Notify.info(data.message, {position: "center-top"});
            }
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

let productStocks = [];
let selectedStock = null;

async function loadProductsDetails() {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get("pId");

    if (!pId) {
        Notiflix.Notify.failure("No product selected.", {position: "center-top"});
        return;
    }

    try {
        const response = await fetch(`api/products/loadSingleProduct/${pId}`);

        if (!response.ok) {
            Notiflix.Notify.failure("Failed to load product.", {position: "center-top"});
            return;
        }

        const data = await response.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
            return;
        }

        const pData = data.productData;

        document.getElementById("productTitle").innerHTML = pData.title;
        document.getElementById("subCategory1").innerHTML = pData.subCategoryName;
        document.getElementById("subCategory2").innerHTML = pData.subCategoryName;
        document.getElementById("categoryName").innerHTML = pData.categoryName;


        const desc = document.getElementById("productDescription");
        if (desc) desc.innerHTML = `<p>${pData.description}</p>`;

        //Images
        renderImages(pData.images);

        renderColor(pData.colorValue, pData.colorHex);

        //Size buttons
        productStocks = pData.stockDTOList || [];
        renderSizeButtons(productStocks);

        if (productStocks.length > 0) {
            selectStock(productStocks[0]);
        }

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}


function renderImages(images) {
    const firstImage = images && images.length > 0
        ? "assets/images/" + images[0]
        : "assets/images/default.png";

    // Main image
    const mainImg = document.getElementById("main-product-image");
    mainImg.src = firstImage;
    mainImg.setAttribute("data-zoom", firstImage);

    // Thumbnails
    const swiperWrapper = document.querySelector(".product-thumbnails-slider .swiper-wrapper");
    if (!swiperWrapper) return;
    swiperWrapper.innerHTML = "";

    const imgList = (images && images.length > 0) ? images : ["default.png"];

    imgList.forEach((imgFile, index) => {
        const imgPath = "assets/images/" + imgFile;
        const slide = `
            <div class="swiper-slide thumbnail-item ${index === 0 ? 'active' : ''}"
                 data-image="${imgPath}"
                 onclick="changeMainImage('${imgPath}', this)">
                <img src="${imgPath}" alt="Product Thumbnail" class="img-fluid">
            </div>`;
        swiperWrapper.innerHTML += slide;
    });
}

function renderColor(colorValue, colorHex) {
    const colorOptionsEl = document.getElementById("colorOption");
    const selectedColorLabel = document.getElementById("selectedColor");

    if (!colorOptionsEl || !colorValue) return;
    colorOptionsEl.innerHTML = "";

    const swatch = document.createElement("div");
    swatch.className = "color-option active";
    swatch.setAttribute("data-color", colorValue);
    swatch.style.backgroundColor = colorHex || "#af1b1b";
    swatch.innerHTML = `<i class="bi bi-check"></i>`;
    colorOptionsEl.appendChild(swatch);

    if (selectedColorLabel) selectedColorLabel.textContent = colorValue;
}

function renderSizeButtons(stocks) {

    const sizeOptionsEl = document.getElementById("sizeBtn");
    const selectedSizeLabel = document.getElementById("selectedSize");

    if (!sizeOptionsEl) return;
    sizeOptionsEl.innerHTML = "";

    if (stocks.length === 0) {
        sizeOptionsEl.innerHTML = `<span class="text-muted">No sizes available</span>`;
        return;
    }

    stocks.forEach((stock, index) => {
        const isOutOfStock = stock.quantity <= 0;
        const btn = document.createElement("div");
        btn.className = "size-option" + (index === 0 ? " active" : "");
        btn.setAttribute("data-stock-id", stock.stockId);
        btn.textContent = stock.sizeValue || "One Size";

        if (isOutOfStock) {
            btn.title = "Out of stock";
        } else {

            btn.addEventListener("click", () => {
                // Update active class
                document.querySelectorAll(".size-option").forEach(el => el.classList.remove("active"));
                btn.classList.add("active");

                // Update label
                if (selectedSizeLabel) selectedSizeLabel.textContent = stock.sizeValue || "One Size";

                // Update price, stock count, quantity max
                selectStock(stock);
            });

        }

        sizeOptionsEl.appendChild(btn);
    });
}

// ── Updates price, stock count, quantity input for a given stock ──
function selectStock(stock) {
    selectedStock = stock;

    const discountAmount = stock.price * (DISCOUNT_PERCENT / 100);
    const originalPrice = stock.price + discountAmount;

    document.getElementById("currentPrice").innerHTML = `Rs.${stock.price.toFixed(2)}`;
    document.getElementById("oldPrice").innerHTML = `Rs.${originalPrice.toFixed(2)}`;

    const discountEl = document.getElementById("discount");
    if (discountEl) discountEl.innerHTML = `-${DISCOUNT_PERCENT}%`;

    document.getElementById("stock").innerHTML = `(${stock.quantity} items left)`;

    // ── Stock availability icon + label ──
    const stockIconEl = document.getElementById("stockIcon");
    const stockLabelEl = document.getElementById("stockLabel");

    if (stockIconEl && stockLabelEl) {
        if (stock.quantity > 0) {
            stockIconEl.className = "bi bi-check-circle-fill text-success";
            stockLabelEl.textContent = "In Stock";
        } else {
            stockIconEl.className = "bi bi-x-circle-fill text-danger";
            stockLabelEl.textContent = "Out of Stock";
        }
    }

    // Update quantity input max to available stock
    const qtyInput = document.querySelector(".quantity-input");
    if (qtyInput) {
        qtyInput.max = stock.quantity;
        qtyInput.value = 1;
    }
}


// ── Thumbnail click handler ──
function changeMainImage(imgPath, thumbEl) {
    const mainImg = document.getElementById("main-product-image");
    mainImg.src = imgPath;
    mainImg.setAttribute("data-zoom", imgPath);

    document.querySelectorAll(".thumbnail-item").forEach(el => el.classList.remove("active"));
    thumbEl.classList.add("active");
}

function handleQuantityClick(e) {
    const qtyInput = document.querySelector(".qtyInput");
    if (!qtyInput) return;

    if (e.target.closest(".quantity-btn.increase")) {
        const max = parseInt(qtyInput.max) || 99;
        const current = parseInt(qtyInput.value) || 1;
        if (current < max) {
            qtyInput.value = current + 1;
        } else {
            Notiflix.Notify.warning("Maximum available quantity reached.", {position: "center-top"});
        }
    }

    if (e.target.closest(".quantity-btn.decrease")) {
        const current = parseInt(qtyInput.value) || 1;
        if (current > 1) qtyInput.value = current - 1;
    }
}

function handleWishlist() {
    if (!selectedStock) {
        Notiflix.Notify.warning("Please select a size first.", { position: "center-top" });
        return;
    }

    addToWishList(selectedStock.stockId);
}

document.removeEventListener("click", handleQuantityClick);
document.addEventListener("click", handleQuantityClick);
