let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let itemsPerPage = 12;
let currentViewMode = 'grid';
let currentCategory = '';

// Category data mapping
const categoryData = {
    'men': {
        title: "Men's Collection",
        description: "Discover our premium selection of men's fashion",
        filterClass: 'filter-clothing',
        breadcrumb: 'Men'
    },
    'women': {
        title: "Women's Collection",
        description: "Explore our latest women's fashion trends",
        filterClass: 'filter-accessories',
        breadcrumb: 'Women'
    },
    'accessories': {
        title: "Accessories",
        description: "Complete your look with our exclusive accessories",
        filterClass: 'filter-accessories',
        breadcrumb: 'Accessories'
    },
    'sale': {
        title: "Sale Items",
        description: "Get amazing deals on selected products",
        filterClass: 'filter-sale',
        breadcrumb: 'Sale'
    }
};

// Initialize category page
function initCategoryPage() {
    // Get category from URL parameter or localStorage
    const urlParams = new URLSearchParams(window.location.search);
    currentCategory = urlParams.get('category') || sessionStorage.getItem('selectedCategory') || 'men';

    // Set up category information
    setupCategoryInfo();

    // Load products data
    loadCategoryProducts();

    // Initialize filters
    initializeFilters();

    // Apply AOS animations
    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            easing: 'ease-in-out',
            once: true,
            mirror: false
        });
    }
}

// Setup category header and breadcrumbs
function setupCategoryInfo() {
    const category = categoryData[currentCategory] || categoryData['men'];

    document.getElementById('categoryTitle').textContent = category.title;
    document.getElementById('categoryDescription').textContent = category.description;
    document.getElementById('breadcrumb-category').innerHTML = `<a href="category.html?category=${currentCategory}">${category.breadcrumb}</a>`;
    document.getElementById('breadcrumb-current').textContent = category.breadcrumb;

    document.title = `${category.title} - fleXZone`;
}

// Load products for the selected category
function loadCategoryProducts() {
    // Get all products from localStorage
    const savedProducts = localStorage.getItem('products');

    if (savedProducts) {
        allProducts = JSON.parse(savedProducts);
    } else {
        // Use default product data if not found in localStorage
        allProducts = getDefaultProducts();
    }

    // Filter products by category
    filteredProducts = filterProductsByCategory();

    // Update product count
    document.getElementById('productCount').textContent = `${filteredProducts.length} Products`;

    // Display products
    displayProducts();

    // Generate pagination
    generatePagination();
}

// Filter products by current category
function filterProductsByCategory() {
    const category = categoryData[currentCategory];

    if (!category) {
        return allProducts;
    }

    // Filter based on product category/type
    return allProducts.filter(product => {
        if (currentCategory === 'men') {
            return product.category === 'Men' || product.gender === 'men';
        } else if (currentCategory === 'women') {
            return product.category === 'Women' || product.gender === 'women';
        } else if (currentCategory === 'accessories') {
            return product.type === 'Accessories' || product.category === 'Accessories';
        } else if (currentCategory === 'sale') {
            return product.discount && product.discount > 0;
        }
        return true;
    });
}

// Initialize filters based on products
function initializeFilters() {
    const sizes = new Set();
    const colors = new Set();

    filteredProducts.forEach(product => {
        if (product.sizes && Array.isArray(product.sizes)) {
            product.sizes.forEach(size => sizes.add(size));
        }
        if (product.colors && Array.isArray(product.colors)) {
            product.colors.forEach(color => colors.add(color));
        }
    });

    // Show/hide size filter if applicable
    if (sizes.size > 0) {
        document.getElementById('sizeFilterSection').style.display = 'block';
        populateFilterOptions('sizeFilterContainer', Array.from(sizes), 'size');
    }

    // Show/hide color filter if applicable
    if (colors.size > 0) {
        document.getElementById('colorFilterSection').style.display = 'block';
        populateFilterOptions('colorFilterContainer', Array.from(colors), 'color');
    }
}

// Populate filter options dynamically
function populateFilterOptions(containerId, options, filterType) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';

    options.forEach(option => {
        const div = document.createElement('div');
        div.className = 'filter-option';

        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `${filterType}-${option}`;
        input.value = option;
        input.dataset.filterType = filterType;
        input.onchange = applyFilters;

        const label = document.createElement('label');
        label.htmlFor = `${filterType}-${option}`;
        label.textContent = option;

        div.appendChild(input);
        div.appendChild(label);
        container.appendChild(div);
    });
}

// Apply all active filters
function applyFilters() {
    const selectedSizes = Array.from(document.querySelectorAll('[data-filter-type="size"]:checked')).map(el => el.value);
    const selectedColors = Array.from(document.querySelectorAll('[data-filter-type="color"]:checked')).map(el => el.value);
    const selectedRatings = Array.from(document.querySelectorAll('#ratingFilterContainer input:checked')).map(el => parseInt(el.value));

    filteredProducts = filterProductsByCategory().filter(product => {
        // Size filter
        if (selectedSizes.length > 0 && product.sizes) {
            if (!selectedSizes.some(size => product.sizes.includes(size))) {
                return false;
            }
        }

        // Color filter
        if (selectedColors.length > 0 && product.colors) {
            if (!selectedColors.some(color => product.colors.includes(color))) {
                return false;
            }
        }

        // Rating filter
        if (selectedRatings.length > 0) {
            const productRating = Math.floor(product.rating || 0);
            if (!selectedRatings.includes(productRating)) {
                return false;
            }
        }

        return true;
    });

    currentPage = 1;
    displayProducts();
    generatePagination();
}

// Apply price filter
function applyPriceFilter() {
    const minPrice = parseFloat(document.getElementById('minPrice').value) || 0;
    const maxPrice = parseFloat(document.getElementById('maxPrice').value) || Infinity;

    filteredProducts = filterProductsByCategory().filter(product => {
        const price = product.price || 0;
        return price >= minPrice && price <= maxPrice;
    });

    currentPage = 1;
    displayProducts();
    generatePagination();
}

// Clear all filters
function clearFilters() {
    // Reset filter inputs
    document.querySelectorAll('.filter-option input').forEach(input => {
        input.checked = false;
    });

    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('sortSelect').value = 'newest';

    filteredProducts = filterProductsByCategory();
    currentPage = 1;
    displayProducts();
    generatePagination();
}

// Apply sorting
function applySorting() {
    const sortValue = document.getElementById('sortSelect').value;

    switch (sortValue) {
        case 'price-low':
            filteredProducts.sort((a, b) => (a.price || 0) - (b.price || 0));
            break;
        case 'price-high':
            filteredProducts.sort((a, b) => (b.price || 0) - (a.price || 0));
            break;
        case 'rating':
            filteredProducts.sort((a, b) => (b.rating || 0) - (a.rating || 0));
            break;
        case 'popularity':
            filteredProducts.sort((a, b) => (b.reviews || 0) - (a.reviews || 0));
            break;
        case 'newest':
        default:
            filteredProducts.sort((a, b) => (b.id || 0) - (a.id || 0));
    }

    currentPage = 1;
    displayProducts();
    generatePagination();
}

// Display products based on current page
function displayProducts() {
    const container = document.getElementById('productsContainer');
    container.innerHTML = '';

    if (filteredProducts.length === 0) {
        container.innerHTML = `
            <div class="no-products">
                <i class="bi bi-inbox"></i>
                <h3>No Products Found</h3>
                <p>Try adjusting your filters or search for a different product.</p>
                <a href="index.html" class="btn btn-accent" style="margin-top: 20px;">
                    Continue Shopping <i class="bi bi-arrow-right"></i>
                </a>
            </div>
        `;
        return;
    }

    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const productsToDisplay = filteredProducts.slice(startIndex, endIndex);

    productsToDisplay.forEach(product => {
        if (currentViewMode === 'grid') {
            container.appendChild(createProductCard(product));
        } else {
            container.appendChild(createProductListItem(product));
        }
    });

    // Re-initialize animations
    if (typeof AOS !== 'undefined') {
        AOS.refresh();
    }
}

// Create product card (grid view)
function createProductCard(product) {
    const col = document.createElement('div');
    col.className = 'col-md-6 col-lg-4 product-item';
    col.dataset.aos = 'fade-up';

    const discount = product.discount || 0;
    const originalPrice = product.originalPrice || product.price;
    const currentPrice = product.price || 0;

    col.innerHTML = `
        <div class="product-card">
            <div class="product-image">
                ${discount > 0 ? `<span class="badge">${discount}% OFF</span>` : '<span class="badge" style="background: #28a745;">New</span>'}
                <img src="${product.image || 'https://via.placeholder.com/300'}" alt="${product.name}" class="img-fluid main-img" loading="lazy">
                <img src="${product.hoverImage || product.image || 'https://via.placeholder.com/300'}" alt="${product.name}" class="img-fluid hover-img" loading="lazy">
                <div class="product-overlay">
                    <a href="javascript:void(0)" class="btn-cart" onclick="addToCart('${product.id}', '${product.name}', ${product.price})">
                        <i class="bi bi-cart-plus"></i> Add to Cart
                    </a>
                    <div class="product-actions">
                        <a href="javascript:void(0)" class="action-btn" onclick="addToWishlist('${product.id}')">
                            <i class="bi bi-heart"></i>
                        </a>
                        <a href="single-product.html?id=${product.id}" class="action-btn">
                            <i class="bi bi-eye"></i>
                        </a>
                        <a href="javascript:void(0)" class="action-btn">
                            <i class="bi bi-arrow-left-right"></i>
                        </a>
                    </div>
                </div>
            </div>
            <div class="product-info">
                <h5 class="product-title">
                    <a href="single-product.html?id=${product.id}">${product.name}</a>
                </h5>
                <div class="product-price">
                    <span class="current-price">Rs.${currentPrice.toFixed(2)}</span>
                    ${originalPrice > currentPrice ? `<span class="old-price">Rs.${originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <div class="product-rating">
                    ${generateStarRating(product.rating || 0)}
                    <span>(${product.reviews || 0})</span>
                </div>
            </div>
        </div>
    `;

    return col;
}

// Create product list item (list view)
function createProductListItem(product) {
    const discount = product.discount || 0;
    const originalPrice = product.originalPrice || product.price;
    const currentPrice = product.price || 0;

    const div = document.createElement('div');
    div.className = 'product-card-list';
    div.dataset.aos = 'fade-up';

    div.innerHTML = `
        <img src="${product.image || 'https://via.placeholder.com/180'}" alt="${product.name}">
        <div class="product-card-list-content">
            <div>
                <h5 class="product-title mb-2">
                    <a href="single-product.html?id=${product.id}" style="color: var(--heading-color);">${product.name}</a>
                </h5>
                <p class="product-description">${product.description || 'High-quality product with premium materials'}</p>
                <div class="product-rating mb-2">
                    ${generateStarRating(product.rating || 0)}
                    <span>(${product.reviews || 0} reviews)</span>
                </div>
            </div>
            <div class="product-card-list-footer">
                <div class="product-price-list">
                    <span class="current-price" style="font-size: 1.2rem; font-weight: 600;">Rs.${currentPrice.toFixed(2)}</span>
                    ${originalPrice > currentPrice ? `<span class="old-price ms-2">Rs.${originalPrice.toFixed(2)}</span>` : ''}
                </div>
                <div>
                    <button class="btn btn-accent btn-sm" onclick="addToCart('${product.id}', '${product.name}', ${product.price})">
                        <i class="bi bi-cart-plus"></i> Add to Cart
                    </button>
                </div>
            </div>
        </div>
    `;

    return div;
}

// Generate star rating HTML
function generateStarRating(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
        if (i < fullStars) {
            stars += '<i class="bi bi-star-fill"></i>';
        } else if (i === fullStars && hasHalf) {
            stars += '<i class="bi bi-star-half"></i>';
        } else {
            stars += '<i class="bi bi-star"></i>';
        }
    }

    return stars;
}

// Change view mode (grid/list)
function changeViewMode(mode) {
    currentViewMode = mode;

    // Update button states
    document.querySelectorAll('.view-mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.closest('.view-mode-btn').classList.add('active');

    // Update grid layout
    const container = document.getElementById('productsContainer');
    container.classList.remove('grid-view', 'list-view');
    container.classList.add(`${mode}-view`);

    displayProducts();
}

// Generate pagination buttons
function generatePagination() {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    const paginationContainer = document.getElementById('paginationContainer');
    paginationContainer.innerHTML = '';

    if (totalPages <= 1) {
        return;
    }

    // Previous button
    const prevBtn = document.createElement('button');
    prevBtn.className = 'pagination-btn';
    prevBtn.innerHTML = '<i class="bi bi-chevron-left"></i>';
    prevBtn.disabled = currentPage === 1;
    prevBtn.onclick = () => goToPage(currentPage - 1);
    paginationContainer.appendChild(prevBtn);

    // Page buttons
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        pageBtn.textContent = '1';
        pageBtn.onclick = () => goToPage(1);
        paginationContainer.appendChild(pageBtn);

        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.style.padding = '0 5px';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        if (i === currentPage) {
            pageBtn.classList.add('active');
        }
        pageBtn.textContent = i;
        pageBtn.onclick = () => goToPage(i);
        paginationContainer.appendChild(pageBtn);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.style.padding = '0 5px';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }

        const pageBtn = document.createElement('button');
        pageBtn.className = 'pagination-btn';
        pageBtn.textContent = totalPages;
        pageBtn.onclick = () => goToPage(totalPages);
        paginationContainer.appendChild(pageBtn);
    }

    // Next button
    const nextBtn = document.createElement('button');
    nextBtn.className = 'pagination-btn';
    nextBtn.innerHTML = '<i class="bi bi-chevron-right"></i>';
    nextBtn.disabled = currentPage === totalPages;
    nextBtn.onclick = () => goToPage(currentPage + 1);
    paginationContainer.appendChild(nextBtn);
}

// Go to specific page
function goToPage(page) {
    const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        displayProducts();
        generatePagination();

        // Scroll to top of products
        document.getElementById('category-products').scrollIntoView({ behavior: 'smooth' });
    }
}

// Add to cart function
function addToCart(productId, productName, price) {
    let cart = JSON.parse(localStorage.getItem('cart')) || [];

    const existingProduct = cart.find(item => item.id === productId);

    if (existingProduct) {
        existingProduct.quantity += 1;
    } else {
        cart.push({
            id: productId,
            name: productName,
            price: price,
            quantity: 1,
            image: document.querySelector(`img[alt="${productName}"]`)?.src || 'https://via.placeholder.com/150'
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));

    // Show notification
    if (typeof Notiflix !== 'undefined') {
        Notiflix.Notify.Success(`${productName} added to cart!`);
    } else {
        alert(`${productName} added to cart!`);
    }

    // Update cart count if function exists
    if (typeof loadCartCount !== 'undefined') {
        loadCartCount();
    }
}

// Add to wishlist function
function addToWishlist(productId) {
    let wishlist = JSON.parse(localStorage.getItem('wishlist')) || [];

    const existingProduct = wishlist.find(item => item.id === productId);

    if (existingProduct) {
        wishlist = wishlist.filter(item => item.id !== productId);
        if (typeof Notiflix !== 'undefined') {
            Notiflix.Notify.Info('Removed from wishlist');
        }
    } else {
        const product = filteredProducts.find(p => p.id === productId);
        if (product) {
            wishlist.push(product);
            if (typeof Notiflix !== 'undefined') {
                Notiflix.Notify.Success('Added to wishlist!');
            }
        }
    }

    localStorage.setItem('wishlist', JSON.stringify(wishlist));

    // Update wishlist count if function exists
    if (typeof loadWishlistCount !== 'undefined') {
        loadWishlistCount();
    }
}

// Default products (fallback if not in localStorage)
function getDefaultProducts() {
    return [
        {
            id: 1,
            name: "Premium Cotton T-Shirt",
            category: "Men",
            type: "Clothing",
            price: 1499,
            originalPrice: 1999,
            discount: 25,
            image: "https://bootstrapmade.com/content/demo/eStore/assets/img/product/product-1.webp",
            hoverImage: "https://bootstrapmade.com/content/demo/eStore/assets/img/product/product-1-variant.webp",
            rating: 4.5,
            reviews: 24,
            sizes: ["XS", "S", "M", "L", "XL"],
            colors: ["Black", "White", "Blue"],
            description: "Comfortable premium cotton t-shirt"
        },
        {
            id: 2,
            name: "Classic Denim Jeans",
            category: "Men",
            type: "Clothing",
            price: 3499,
            originalPrice: 4499,
            discount: 22,
            image: "https://bootstrapmade.com/content/demo/eStore/assets/img/product/product-2.webp",
            rating: 4.8,
            reviews: 45,
            sizes: ["28", "30", "32", "34", "36"],
            colors: ["Blue", "Black", "Gray"],
            description: "Durable and stylish classic denim jeans"
        },
        {
            id: 3,
            name: "Summer Casual Dress",
            category: "Women",
            type: "Clothing",
            price: 2999,
            originalPrice: 3999,
            discount: 25,
            image: "https://bootstrapmade.com/content/demo/eStore/assets/img/product/product-3.webp",
            rating: 4.6,
            reviews: 32,
            sizes: ["XS", "S", "M", "L", "XL"],
            colors: ["Red", "White", "Yellow"],
            description: "Perfect summer casual dress"
        }
    ];
}