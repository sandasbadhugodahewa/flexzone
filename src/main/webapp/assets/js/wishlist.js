async function addToWishList(stockId) {
    try {
        Notiflix.Loading.pulse("Updating wishlist...", {
            clickToClose: false,
            svgColor: '#0284c7'
        });

        const response = await fetch(`api/wishlist/add-to-wishlist?sId=${stockId}`);

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                if (data.action === "added") {
                    Notiflix.Notify.success(data.message, {position: "center-top"});
                } else {
                    Notiflix.Notify.info(data.message, {position: "center-top"});
                }
                await loadWishlistCount();
            } else {
                if (data.message === "Please login first!") {
                    Notiflix.Report.info("Login Required",
                        "Please login to save items to your wishlist.",
                        "Sign In",
                        () => {
                            window.location = "sign-in.html";
                        }
                    );
                } else {
                    Notiflix.Notify.failure(data.message, {position: "center-top"});
                }
            }
        } else if (response.status === 401) {
            Notiflix.Report.info("Login Required",
                "Please login to save items to your wishlist.",
                "Sign In",
                () => {
                    window.location = "sign-in.html";
                }
            );
        } else {
            Notiflix.Notify.failure("Wishlist update failed!", {position: "center-top"});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    } finally {
        Notiflix.Loading.remove();
    }
}


async function loadWishlist() {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;

    try {
        const response = await fetch("api/wishlist/load-wishlist");

        if (!response.ok) return;

        const data = await response.json();
        console.log(data);

        if (data.status && data.wishlistItems && data.wishlistItems.length > 0) {
            renderWishlistItems(data.wishlistItems);
            updateWishlistCount(data.wishlistItems.length);
        } else {
            renderEmptyWishlist();
            updateWishlistCount(0);
        }
    } catch (e) {
        console.error("Wishlist load failed:", e.message);
        renderEmptyWishlist();
    }
}

function renderWishlistItems(items) {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="row g-3" id="wishlistGrid">
            ${items.map((item, index) => buildWishlistCard(item, index)).join("")}
        </div>`;
}

function buildWishlistCard(item, index) {
    const isOutOfStock = item.quantity <= 0;
    const delay = (index % 4 + 1) * 100;

    const colorDot = item.colorHex
        ? `<span style="display:inline-block; width:10px; height:10px; border-radius:50%;
                        background:${item.colorHex}; border:1px solid #ccc;
                        margin-right:4px; vertical-align:middle;"></span>`
        : "";

    return `
        <div class="col-xl-3 col-lg-4 col-md-6 col-sm-6" data-aos="fade-up" data-aos-delay="${delay}">
            <div class="wishlist-card h-100" style="
                background: #fff;
                border: 1px solid color-mix(in srgb, var(--accent-color), transparent 88%);
                border-radius: 16px;
                overflow: hidden;
                transition: box-shadow 0.25s ease, transform 0.25s ease;
                position: relative;"
                onmouseenter="this.style.boxShadow='0 8px 28px rgba(10,77,184,0.13)'; this.style.transform='translateY(-3px)'"
                onmouseleave="this.style.boxShadow='none'; this.style.transform='translateY(0)'">
 
                <!-- Image -->
                <div style="position:relative; overflow:hidden; height:200px; background:#f8f9fa;">
                    <a href="single-product.html?pId=${item.productId}">
                        <img src="${item.image}" alt="${item.productTitle}"
                             style="width:100%; height:100%; object-fit:cover; transition:transform 0.35s ease;"
                             onmouseenter="this.style.transform='scale(1.06)'"
                             onmouseleave="this.style.transform='scale(1)'"
                             loading="lazy">
                    </a>
 
                    
                    ${isOutOfStock ? `
                    <div style="position:absolute; inset:0; background:rgba(0,0,0,0.45);
                                display:flex; align-items:center; justify-content:center;">
                        <span style="background:#fff; color:#dc3545; font-size:12px;
                                     font-weight:700; padding:5px 12px; border-radius:999px;
                                     letter-spacing:0.5px;">OUT OF STOCK</span>
                    </div>` : ""}
 
                    
                    <button onclick="removeFromWishlist(${item.wishlistId})"
                            title="Remove from wishlist"
                            style="position:absolute; top:10px; right:10px;
                                   width:32px; height:32px; border-radius:50%;
                                   background:#fff; border:none; cursor:pointer;
                                   display:flex; align-items:center; justify-content:center;
                                   box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                                   transition: background 0.2s, color 0.2s; color:#dc3545;"
                            onmouseenter="this.style.background='#dc3545'; this.style.color='#fff'"
                            onmouseleave="this.style.background='#fff'; this.style.color='#dc3545'">
                        <i class="bi bi-trash" style="font-size:13px;"></i>
                    </button>
 
                    <!-- Category badge -->
                    <span style="position:absolute; top:10px; left:10px;
                                 background:var(--accent-color); color:#fff;
                                 font-size:10px; font-weight:700; padding:3px 9px;
                                 border-radius:999px; letter-spacing:0.5px; text-transform:uppercase;">
                        ${item.categoryName || "Product"}
                    </span>
                </div>
 
                <div style="padding: 14px 16px 16px;">
 
                    <a href="single-product.html?pId=${item.productId}"
                       style="text-decoration:none; color:var(--heading-color);">
                        <h6 style="font-weight:700; font-size:14px; margin-bottom:6px;
                                   line-height:1.4; display:-webkit-box;
                                   -webkit-line-clamp:2; -webkit-box-orient:vertical;
                                   overflow:hidden;">${item.productTitle}</h6>
                    </a>
                    
                                       <!-- Meta -->
                    <div style="display:flex; gap:10px; margin-bottom:10px; flex-wrap:wrap;">

                        ${item.sizeValue ? `
                        <span style="font-size:12px; background:color-mix(in srgb, var(--accent-color), transparent 92%);
                                     color:var(--accent-color); padding:2px 8px;
                                     border-radius:4px; font-weight:600;">Size : ${item.sizeValue} </span>` : ""}
                    </div>


                    <!-- Price -->
                    <div style="margin-bottom:12px;">
                        <span style="font-size:16px; font-weight:700; color:var(--accent-color);">
                            Rs. ${item.price.toFixed(2)}
                        </span>
                        ${isOutOfStock
                         ? `<span style="font-size:12px; color:#dc3545; margin-left:8px;">• Out of stock</span>`
                         : `<span style="font-size:12px; color:#198754; margin-left:8px;">• In stock</span>` }
                    </div>
 
                    <div style="display:flex; gap:8px;">
                        ${isOutOfStock
                           ? `<button disabled
                                style="flex:1; padding:8px; border-radius:8px; font-size:13px;
                                       font-weight:600; background:#e9ecef; border:none;
                                       color:#6c757d; cursor:not-allowed;">
                                   <i class="bi bi-bell me-1"></i>Notify Me
                               </button>`
                                : `<button onclick="addToCart(${item.stockId}, 1)"
                                style="flex:1; padding:8px; border-radius:8px; font-size:13px;
                                       font-weight:600; background:var(--accent-color); border:none;
                                       color:#fff; cursor:pointer; transition:opacity 0.2s;"
                                onmouseenter="this.style.opacity='0.88'"
                                onmouseleave="this.style.opacity='1'">
                                   <i class="bi bi-cart-plus me-1"></i>Add to Cart
                               </button>`}

                    </div>
                </div>
            </div>
        </div>`;
}


function renderEmptyWishlist() {
    const container = document.getElementById("wishlistContainer");
    if (!container) return;

    container.innerHTML = `
        <div class="text-center py-5">
            <div style="width:90px; height:90px;
                        background:color-mix(in srgb, var(--accent-color), transparent 90%);
                        border-radius:50%; display:inline-flex;
                        align-items:center; justify-content:center; margin-bottom:20px;">
                <i class="bi bi-heart" style="font-size:42px; color:var(--accent-color);"></i>
            </div>
            <h5 class="fw-bold mb-2">Your wishlist is empty</h5>
            <p class="text-muted mb-4" style="max-width:300px; margin:0 auto 16px;">
                Save your favourite items here and come back to them anytime.
            </p>
            <a href="index.html" style="
                display:inline-flex; align-items:center; gap:8px;
                background:var(--accent-color); color:#fff;
                padding:10px 22px; border-radius:10px;
                font-weight:600; font-size:14px; text-decoration:none;
                transition:opacity 0.2s;"
               onmouseenter="this.style.opacity='0.88'"
               onmouseleave="this.style.opacity='1'">
                <i class="bi bi-bag"></i> Start Shopping
            </a>
        </div>`;
}


async function removeFromWishlist(wishlistId) {
    try {
        const response = await fetch(`api/wishlist/remove/${wishlistId}`, {
            method: "DELETE"
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                Notiflix.Notify.success(data.message, {position: "center-top"});
                await loadWishlist();       // reload grid
                await loadWishlistCount();  // update badge
            } else {
                Notiflix.Notify.failure(data.message, {position: "center-top"});
            }
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

async function loadWishlistCount() {
    try {
        const response = await fetch("api/wishlist/count");
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById("wishlistCountBadge");
            const tabCount = document.getElementById("wishlistTabCount");
            if (badge) badge.textContent = data.count || 0;
            if (tabCount) tabCount.textContent = data.count || 0;
        }
    } catch (e) {
        console.error("Wishlist count error:", e.message);
    }
}


function updateWishlistCount(count) {
    const countEl1 = document.getElementById("wishlistCount");
    if (countEl1) countEl1.textContent = count;
}

