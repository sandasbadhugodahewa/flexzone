function addToCartFromProductPage() {
    if (!selectedStock) {
        Notiflix.Notify.warning("Please select a size first.", {position: "center-top"});
        return;
    }
    if (selectedStock.quantity <= 0) {
        Notiflix.Notify.warning("This size is out of stock.", {position: "center-top"});
        return;
    }
    const qty = parseInt(document.querySelector(".quantity-input").value) || 1;
    addToCart(selectedStock.stockId, qty);
}

async function addToCart(stockId, qty) {

    if (!stockId) {
        Notiflix.Notify.warning("Please select a size first.", {position: "center-top"});
        return;
    }

    try {
        Notiflix.Loading.pulse("Adding to cart...", {
            clickToClose: false,
            svgColor: '#0284c7'
        });

        const response = await fetch(`api/carts/add-to-cart?sId=${stockId}&qty=${qty}`);

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                Notiflix.Notify.success(data.message, {position: "center-top"});
                await loadCartCount();
            } else {
                Notiflix.Notify.failure(data.message, {position: "center-top"});
            }
        } else {
            Notiflix.Notify.failure("Failed to add to cart. Please try again!", {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

async function loadCartCount() {
    try {
        const response = await fetch("api/carts/all-carts");
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById("cartCountBadge");
            if (badge) {
                if (data.status && data.cartItems) {
                    const totalQty = data.cartItems.length;
                    badge.textContent = totalQty;
                } else {
                    badge.textContent = 0;
                }
            }
        }
    } catch (e) {
        console.error("Cart count load failed:", e.message);
    }
}

async function loadCartCards() {
    try {
        Notiflix.Loading.pulse("Loading cart...", {
            clickToClose: false,
            svgColor: '#0284c7'
        });

        const response = await fetch("api/carts/all-carts");

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                renderCartTable(data.cartItems);
                renderCartSummary(data.cartItems);
            } else {
                // Cart is empty
                const container = document.getElementById("cart");
                if (container) {

                    container.innerHTML = `
        <div class="text-center py-5 my-4">

            <div class="mb-3" style="
                width: 100px; height: 100px;
                background: color-mix(in srgb, var(--accent-color), transparent 90%);
                border-radius: 50%;
                display: inline-flex;
                align-items: center;
                justify-content: center;">
                <i class="bi bi-cart-x"
                   style="font-size: 46px; color: var(--accent-color);"></i>
            </div>

            <h4 class="fw-bold mt-3 mb-2">Your Cart is Empty</h4>
            <p class="text-muted mb-4" style="max-width: 300px; margin: 0 auto;">
                Looks like you haven't added anything yet. Start shopping!
            </p>

            <a href="index.html" class="btn btn-accent px-4 py-2">
                <i class="bi bi-bag me-2"></i>Continue Shopping
            </a>
        </div>
    `;

                }
                renderCartSummary([]);
            }
        } else {
            Notiflix.Notify.failure("Failed to load cart!", {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}

function renderCartTable(cartItems) {
    const tbody = document.getElementById("cartTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    cartItems.forEach(cart => {
        const image = cart.images && cart.images.length > 0
            ? "assets/images/" + cart.images[0]
            : "assets/images/default.png";

        const subtotal = (cart.price * cart.qty).toFixed(2);
        const size = cart.sizeValue ? `<small class="text-muted d-block">Size: ${cart.sizeValue}</small>` : "";

        tbody.innerHTML += `
           
                        <div class="cart-item" data-aos="fade-up" data-aos-delay="100">
                            <div class="row align-items-center gy-3">
                                <div class="col-lg-6 col-12 mb-2 mb-lg-0">
                                    <div class="product-info d-flex align-items-center">
                                        <div class="product-image">
                                            <img src="${image}" alt="${cart.productTitle}" class="img-fluid" loading="lazy">
                                        </div>
                                        <div class="product-details">
                                            <h6 class="product-title">${cart.productTitle}</h6>
                                            <div class="product-meta">
                                                <span class="product-color">Color: ${cart.colorValue || 'N/A'}</span>
                                                <span class="product-size">Size: ${size}</span>
                                            </div>
                                            <button class="remove-item" type="button" onclick="removeCartItem(${cart.cartId});">
                                                <i class="bi bi-trash"></i> Remove
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div class="col-4 col-lg-2 text-center">
                                    <div class="price-tag">
                                        <span class="current-price" style="font-size: 14px; font-weight: 600;">Rs. ${cart.price.toFixed(2)}</span>
                                    </div>
                                </div>
                                <div class="col-4 col-lg-2 text-center">
                                    <div class="quantity-selector">
                                        <button class="quantity-btn decrease" onclick="updateCartQty(${cart.cartId}, ${cart.qty - 1})">
                                            <i class="bi bi-dash"></i>
                                        </button>
                                        <input type="number" class="quantity-input" value="${cart.qty}" min="1" readonly>
                                        <button class="quantity-btn increase" onclick="updateCartQty(${cart.cartId}, ${cart.qty + 1})">
                                            <i class="bi bi-plus"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="col-4 col-lg-2 text-center">
                                    <div class="item-total" style="font-size: 14px; font-weight: 600;">
                                        <span>Rs. ${subtotal}</span>
                                    </div>
                                </div>
                            </div>
                        </div><!-- End Cart Item -->
           
           `;
    });
}

let deliveryTypes = [];
let selectedDeliveryTypeId = null;

async function renderCartSummary(cartItems) {

    if (deliveryTypes.length === 0) {
        try {
            const res = await fetch("api/carts/delivery-types");
            if (res.ok) {
                const data = await res.json();
                if (data.status) deliveryTypes = data.deliveryTypes;
            }
        } catch (e) {
            console.error("Failed to load delivery types:", e.message);
        }
    }

    // subtotal
    let subtotal = 0;
    cartItems.forEach(cart => {
        subtotal += cart.price * cart.qty;
    });

    // shipping
    const shippingContainer = document.getElementById("shippingOptions");
    if (shippingContainer && deliveryTypes.length > 0) {
        shippingContainer.innerHTML = "";

        deliveryTypes.forEach((dt, index) => {
            const isChecked = index === 0;
            if (isChecked) selectedDeliveryTypeId = dt.id;

            shippingContainer.innerHTML += `
                <div class="form-check">
                    <input class="form-check-input" type="radio"
                           name="shipping"
                           id="shipping_${dt.id}"
                           value="${dt.price}"
                           data-id="${dt.id}"
                           ${isChecked ? "checked" : ""}>
                           <label class="form-check-label" for="shipping_${dt.id}">
                        ${dt.name} — Rs. ${dt.price.toFixed(2)}
                    </label>
                </div>`;
        });

        // Recalculate when shipping changes
        shippingContainer.querySelectorAll('input[name="shipping"]').forEach(radio => {
            radio.addEventListener("change", () => {
                selectedDeliveryTypeId = parseInt(radio.getAttribute("data-id"));
                updateSummaryTotals(cartItems);
            });
        });
    }

    updateSummaryTotals(cartItems);

}

function updateSummaryTotals(cartItems) {

    let subtotal = 0;
    cartItems.forEach(cart => {
        subtotal += cart.price * cart.qty;
    });

    // selected shipping price
    const selectedRadio = document.querySelector('input[name="shipping"]:checked');
    let shippingCost = selectedRadio ? parseFloat(selectedRadio.value) : 0;

    // Free shipping over Rs.5000
    if (subtotal >= 5000) {
        shippingCost = 0;
        const shippingEl = document.getElementById("shippingOptions");
        if (shippingEl) shippingEl.textContent = `Free Shipping Over Rs.5000`;
    }

    const TAX_RATE = 0.03;
    const tax      = subtotal * TAX_RATE;
    const discount = 0; // wire up coupon later
    const total    = subtotal + shippingCost + tax - discount;

    const subtotalEl = document.getElementById("summarySubtotal");
    const discountEl = document.getElementById("summaryDiscount");
    const totalEl    = document.getElementById("summaryTotal");
    const taxEl    = document.getElementById("summaryTax");

    if (subtotalEl) subtotalEl.textContent = `Rs. ${subtotal.toFixed(2)}`;
    if (discountEl) discountEl.textContent = `-Rs. ${discount.toFixed(2)}`;
    if (totalEl)    totalEl.textContent    = `Rs. ${total.toFixed(2)}`;
    if (taxEl)    taxEl.textContent    = `Rs. ${tax.toFixed(2)}`;
}

async function removeCartItem(cartId) {
    try {
        Notiflix.Loading.pulse("Wait...", {
            clickToClose: false,
            svgColor: '#0284c7'
        });

        const response = await fetch(`api/carts/remove-cart/${cartId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                Notiflix.Notify.success(data.message, {
                    position: 'center-top'
                });
                loadCartCards();
                loadCartCount();
            } else {
                Notiflix.Notify.failure(data.message, {
                    position: 'center-top'
                });
            }
        } else {
            Notiflix.Notify.failure("Cart item removing failed!", {
                position: 'center-top'
            });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {
            position: 'center-top'
        });
    } finally {
        Notiflix.Loading.remove();
    }
}
