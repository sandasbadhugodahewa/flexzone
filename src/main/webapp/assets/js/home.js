const DISCOUNT_PERCENT = 10;
let allProducts = [];
let filteredProducts = [];
let visibleCount = 12;
const LOAD_MORE_COUNT = 8;
let reviewVisibleCount = 1;
const REVIEW_LOAD_MORE_COUNT = 1;

async function loadProducts() {
    try {
        const response = await fetch("api/products/loadProducts");

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                allProducts = data.products;
                filteredProducts = [...allProducts];
                newArrivalItems();
                renderProducts();
            } else {
                Notiflix.Notify.info(data.message, {
                    position: "center-top"
                });
            }
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {
            position: "center-top"
        });
    }
}

async function newArrivalItems() {
    try {
        const response = await fetch("api/products/loadNewArrivals");
        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                const nProducts = data.products;
                let container = document.getElementById("newArrivalItemsContainer");
                container.innerHTML = "";
                nProducts.forEach(product => {
                    let image1 = product.images && product.images.length > 0
                        ? "assets/images/productImg/" + product.images[0]
                        : "assets/images/default.png";

                    let image2 = product.images && product.images.length > 1
                        ? "assets/images/productImg/" + product.images[1]
                        : image1;

                    const discountAmount = product.price * (DISCOUNT_PERCENT / 100);
                    const oldPrice = (product.price + discountAmount).toFixed(2);

                    const firstStock = product.stockDTOList && product.stockDTOList.length > 0
                        ? product.stockDTOList.find(s => s.quantity > 0) || product.stockDTOList[0]
                        : null;
                    const stockId = firstStock ? firstStock.stockId : null;

                    const createdDate = new Date(product.createdAt);
                    const currentDate = new Date();
                    const diffTime = currentDate - createdDate;
                    const diffDays = diffTime / (1000 * 60 * 60 * 24);

                    let badge = "";
                    if (product.quantity <= 0) {
                        badge = `<span class="badge bg-danger">Sold Out</span>`;
                    } else if (diffDays <= 14) {
                        badge = `<span class="badge bg-success">New</span>`;
                    }

                    let card = `
                    <div class="col-md-6 col-lg-3" data-aos="fade-up" data-aos-delay="100">
                        <div class="product-card">
                            <div class="product-image">
                                <img src="${image1}" class="img-fluid default-image" alt="Product">
                                <img src="${image2}" class="img-fluid hover-image" alt="Product hover">
                                <div class="product-tags">
                                    ${badge}
                                </div>

                                <div class="product-actions">
                                    <button class="btn-wishlist" onclick="addToWishList(${stockId});" 
                                           type="button" aria-label="Wishlist">
                                           <i class="bi bi-heart"></i>
                                    </button>
                                    <a class="btn-quickview" href="single-product.html?pId=${product.id}" aria-label="View">
                                        <i class="bi bi-eye"></i>
                                    </a>
                                </div>
                            </div>

                            <div class="product-info">
                                <h3 class="product-title">
                                    <a href="single-product.html?pId=${product.id}">
                                        ${product.title}
                                    </a>
                                </h3>
                                <div class="product-price">
                                    <span class="current-price">
                                        Rs.${product.price}.00
                                    </span>
                                    <span class="old-price">
                                        Rs.${oldPrice}
                                    </span>
                                </div>

                                <button class="btn btn-add-to-cart"
                                        onclick="addToCart(${stockId},1)">
                                    <i class="bi bi-bag-plus me-2"></i>
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                    `;
                    container.innerHTML += card;
                });
            } else {
                Notiflix.Notify.info(data.message, {
                    position: "center-top"
                });
            }
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {
            position: "center-top"
        });
    }
}

function renderProducts() {

    let container = document.getElementById("productContainer");
    container.innerHTML = "";
    const visibleProducts = filteredProducts.slice(0, visibleCount);
    visibleProducts.forEach(product => {

        let image1 = product.images && product.images.length > 0
            ? "assets/images/productImg/" + product.images[0]
            : "assets/images/default.png";

        let image2 = product.images && product.images.length > 1
            ? "assets/images/productImg/" + product.images[1]
            : "assets/images/default.png";

        const discountAmount = product.price * (DISCOUNT_PERCENT / 100);
        const oldPrice = (product.price + discountAmount).toFixed(2);

        const firstStock = product.stockDTOList && product.stockDTOList.length > 0
            ? product.stockDTOList.find(s => s.quantity > 0) || product.stockDTOList[0]
            : null;

        const stockId = firstStock ? firstStock.stockId : null;

        const createdDate = new Date(product.createdAt);
        const currentDate = new Date();

        const diffTime = currentDate - createdDate;
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        let badge = "";
        if (diffDays <= 14) {
            badge = `<span class="badge bg-success">New</span>`;
        } else if (product.quantity <= 0) {
            badge = `<span class="badge bg-danger">Sold Out</span>`;
        }

        const fullStars = Math.floor(product.averageRating);
        let stars = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += `<i class="bi bi-star-fill"></i>`;
            } else {
                stars += `<i class="bi bi-star"></i>`;
            }
        }

        let card = `
        <div class="col-md-6 col-lg-3 product-item isotope-item filter-clothing">
            <div class="product-card">
                <div class="product-image">
                    ${badge}
                    <img src="${image1}" class="img-fluid main-img">
                    <img src="${image2}" class="img-fluid hover-img">
                    <div class="product-overlay">
                        <a class="btn btn-cart"
                           onclick="addToCart(${stockId},1);">
                           <i class="bi bi-cart-plus"></i> Add to Cart
                        </a>
                        <div class="product-actions">
                            <a class="action-btn"
                               onclick="addToWishList(${stockId});">
                               <i class="bi bi-heart"></i>
                            </a>
                            <a href="single-product.html?pId=${product.id}"
                               class="action-btn">
                               <i class="bi bi-eye"></i>
                            </a>
                        </div>
                    </div>
                </div>

                <div class="product-info">
                    <div class="product-category-tag">
                        ${product.categoryName || ''}
                    </div>
                    <h5 class="product-title">
                        <a href="single-product.html?pId=${product.id}">
                            ${product.title}
                        </a>
                    </h5>
                    <div class="product-price">
                        <span class="current-price">
                            Rs.${product.price}.00
                        </span>
                        <span class="old-price">
                            Rs.${oldPrice}
                        </span>
                    </div>
                    <div class="product-rating">
                           ${stars}
                        <span>(${product.totalReviews})</span>
                    </div>
                </div>
            </div>
        </div>
        `;
        container.innerHTML += card;
    });
    const btn = document.getElementById("viewAllBtn");
    if (visibleCount >= filteredProducts.length) {
        btn.style.display = "none";
    } else {
        btn.style.display = "inline-block";
    }
}

function loadMoreProducts() {
    visibleCount += LOAD_MORE_COUNT;
    renderProducts();
}

function filterProducts(gender, button) {
    document.querySelectorAll(".f1").forEach(btn=>{
        btn.classList.remove("active");
    });
    button.classList.add("active");
    visibleCount = 12;
    if(gender==="ALL"){
        filteredProducts=[...allProducts];
    }else{
        filteredProducts=allProducts.filter(product=>
            product.genderName.toUpperCase()===gender
        );
    }
    renderProducts();
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
        console.log(pData);

        document.getElementById("productTitle").innerHTML = pData.title;
        document.getElementById("subCategory1").innerHTML = pData.subCategoryName;
        document.getElementById("subCategory2").innerHTML = pData.subCategoryName;
        document.getElementById("categoryName").innerHTML = pData.categoryName;

        const desc = document.getElementById("productDescription");
        if (desc) desc.innerHTML = `    <h4>Product Overview</h4>
                                     <p>${pData.description}</p>`;

        const singleProductReview = document.getElementById("singleProductReview");

        const fullStars = Math.floor(pData.averageRating);
        const hasHalfStar = (pData.averageRating - fullStars) >= 0.5;

        let stars = "";
        for (let i = 1; i <= 5; i++) {
            if (i <= fullStars) {
                stars += `<i class="bi bi-star-fill"></i>`;
            } else if (i === fullStars + 1 && hasHalfStar) {
                stars += `<i class="bi bi-star-half"></i>`;
            } else {
                stars += `<i class="bi bi-star"></i>`;
            }
        }
        singleProductReview.innerHTML = `
    ${stars}
    <span class="rating-count">
        (${pData.totalReviews})
    </span>
`;

        //Images
        renderImages(pData.images);
        renderColor(pData.colorValue, pData.colorHex);
        renderSpecifications(pData.productDetails);

        productStocks = pData.stockDTOList || [];
        renderSizeButtons(productStocks);

        renderReviews(pData.id)

        if (productStocks.length > 0) {
            selectStock(productStocks[0]);
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

function renderImages(images) {
    const firstImage = images && images.length > 0
        ? "assets/images/productImg/" + images[0]
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
        const imgPath = "assets/images/productImg/" + imgFile;
        const slide = `
            <div class="swiper-slide thumbnail-item ${index === 0 ? 'active' : ''}"
                 data-image="${imgPath}"
                 onclick="changeMainImage('${imgPath}', this)">
                <img src="${imgPath}" alt="Product Thumbnail" class="img-fluid">
            </div>`;
        swiperWrapper.innerHTML += slide;
    });
}

async function renderReviews(productId){
    try {
        const response = await fetch(`api/reviews/get-reviews/${productId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                const allReviews = data.reviews;
                const summary = data.summaries;
                let container = document.getElementById("reviewContainer");

                document.getElementById("reviews-tab").innerHTML = `Reviews (${summary.totalReviews})`;
                document.getElementById("pr-score-number").innerText = summary.averageRating.toFixed(1);
                document.getElementById("pr-score-count").innerText = `Based on ${summary.totalReviews} verified reviews`;
                document.getElementById("pr-bar-count-5").innerText = summary.fiveStar;
                document.getElementById("pr-bar-count-4").innerText = summary.fourStar;
                document.getElementById("pr-bar-count-3").innerText = summary.threeStar;
                document.getElementById("pr-bar-count-2").innerText = summary.twoStar;
                document.getElementById("pr-bar-count-1").innerText = summary.oneStar;

                const total = summary.totalReviews;
                document.getElementById("pr-bar-fill-5").style.width =
                    total ? (summary.fiveStar / total * 100) + "%" : "0%";
                document.getElementById("pr-bar-fill-4").style.width =
                    total ? (summary.fourStar / total * 100) + "%" : "0%";
                document.getElementById("pr-bar-fill-3").style.width =
                    total ? (summary.threeStar / total * 100) + "%" : "0%";
                document.getElementById("pr-bar-fill-2").style.width =
                    total ? (summary.twoStar / total * 100) + "%" : "0%";
                document.getElementById("pr-bar-fill-1").style.width =
                    total ? (summary.oneStar / total * 100) + "%" : "0%";

                container.innerHTML = allReviews.map(review => {

                    const names = review.customerName.trim().split(" ");
                    const initials = (names[0]?.charAt(0) || "") + (names[names.length - 1]?.charAt(0) || "");
                    const avatar = initials.toUpperCase();

                    const stars = Array.from({length: 5}).map((_, i) =>
                        i < review.rating
                            ? `<i class="bi bi-star-fill"></i>`
                            : `<i class="bi bi-star"></i>`
                    ).join("");

                    return `
                    
<article class="pr-review">
    <div class="pr-review-avatar" style="width:36px;height:36px;border-radius:50%;
                            background:color-mix(in srgb,var(--accent-color),transparent 85%);
                            color:var(--accent-color);font-weight:700;font-size:13px;
                            display:inline-flex;align-items:center;justify-content:center;
                            margin-right:10px;flex-shrink:0;">
        ${avatar}
    </div>
    <div class="pr-review-body">
        <div class="pr-review-top">
            <div>
                <span class="pr-reviewer-name">
                    ${review.customerName}
                </span>
                <span class="pr-verified">
                    <i class="bi bi-patch-check-fill"></i>
                    Verified Purchase
                </span>
            </div>
            <span class="pr-review-date">
                ${review.createdAt}
            </span>
        </div>
        <div class="rv-rating">
                        ${stars}
                        <span class="rv-rating-num">(${review.rating}.0)</span>
        </div>
        <h5 class="pr-review-title">
            ${review.reviewTitle}
        </h5>
        <p class="pr-review-text">
            ${review.review}
        </p>
        <div class="pr-review-meta-tags">
               <span class="pr-tag">Size: M</span>
               <span class="pr-tag">Color: Dark Pink</span>
        </div>
    </div>
</article>
                  `;

                }).join("");

            }else {
                console.error(data.message);
            }
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {
            position: "center-top"
        });
    }
    const btn = document.getElementById("pr-load-more");
    if (reviewVisibleCount >= allReviews.length) {
        btn.style.display = "none";
    } else {
        btn.style.display = "inline-block";
    }
}

function loadMoreReviews() {
    reviewVisibleCount += REVIEW_LOAD_MORE_COUNT;
    renderReviews();
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

function renderSpecifications(specifications) {

    const container = document.getElementById("specificationsContainer");
    const tabItem = document.getElementById("specificationsTabItem");

    container.innerHTML = "";

    if (!specifications || Object.keys(specifications).length === 0) {

        tabItem.style.display = "none";
        return;
    }

    tabItem.style.display = "block";

    Object.entries(specifications).forEach(([key, value]) => {

        container.innerHTML += `
            <div class="specs-row">
                <div class="specs-label">
                    ${key}
                </div>

                <div class="specs-value">
                    ${value}
                </div>
            </div>
        `;
    });
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

//Updates price, stock count, quantity
function selectStock(stock) {
    selectedStock = stock;

    const discountAmount = stock.price * (DISCOUNT_PERCENT / 100);
    const originalPrice = stock.price + discountAmount;

    document.getElementById("currentPrice").innerHTML = `Rs.${stock.price.toFixed(2)}`;
    document.getElementById("oldPrice").innerHTML = `Rs.${originalPrice.toFixed(2)}`;

    const discountEl = document.getElementById("discount");
    if (discountEl) discountEl.innerHTML = `-${DISCOUNT_PERCENT}%`;

    document.getElementById("stock").innerHTML = `(${stock.quantity} items left)`;

    //Stock availability
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

    const qtyInput = document.querySelector(".quantity-input");
    if (qtyInput) {
        qtyInput.max = stock.quantity;
        qtyInput.value = 1;
    }
}


//Thumbnail click
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
        Notiflix.Notify.warning("Please select a size first.", {position: "center-top"});
        return;
    }

    addToWishList(selectedStock.stockId);
}

document.removeEventListener("click", handleQuantityClick);
document.addEventListener("click", handleQuantityClick);
