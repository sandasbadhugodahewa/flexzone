let currentPage = 0;
const ordersPerPage = 4;
let allOrders = [];

async function loadOrderCard() {
    const container = document.getElementById("orderContainer");
    try {
        container.innerHTML = `
            <div class="text-center py-4">
                <div class="spinner-border text-primary" role="status" style="width:2rem;height:2rem;"></div>
                <p class="mt-2 text-muted" style="font-size:14px;">Loading your orders...</p>
            </div>`;

        const response = await fetch("api/orders/my-orders");

        if (!response.ok) {
            showEmptyOrders(container);
            return;
        }

        const data = await response.json();

        if (!data.status) {
            showEmptyOrders(container, data.message);
            document.getElementById("paginationContainer").style.display = "none";
            return;
        }

        allOrders = data.orders;
        currentPage = 0;

        renderOrderPage();
        await setupPagination(allOrders.length);

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: "center-top"});
    }
}

function renderOrderPage() {
    const container = document.getElementById("orderContainer");
    const start = currentPage * ordersPerPage;
    const pageData = allOrders.slice(start, start + ordersPerPage);

    container.innerHTML = "";
    pageData.forEach((order, index) => {
        container.innerHTML += buildOrderCard(order, index);
    });
    container.scrollIntoView({behavior: "smooth", block: "start"});
}

function buildOrderCard(order, index) {

    const paymentStatus = order.status;
    const deliveryStatus = order.deliveryStatus;

    const payMap = {
        "PAID": {
            cls: "badge-soft-success",
            icon: "bi-check-circle-fill",
            label: "Paid"
        },

        "PENDING": {
            cls: "badge-soft-warning",
            icon: "bi-clock-fill",
            label: "Pending"
        },

        "BLOCKED": {
            cls: "badge-soft-danger",
            icon: "bi-x-circle-fill",
            label: "Payment Failed"
        }
    };

    const pay = payMap[paymentStatus] || {
        cls: "badge-soft-secondary",
        icon: "bi-question-circle",
        label: paymentStatus || "Unknown"
    };

    const deliveryMap = {
        "APPROVED": {icon: "bi-check-circle", label: "Approved", timelineStep: 1},
        "PACKING": {icon: "bi-box-seam", label: "Packing", timelineStep: 2},
        "SHIPPED": {icon: "bi-truck", label: "Shipped", timelineStep: 3},
        "DELIVERED": {icon: "bi-house-door", label: "Delivered", timelineStep: 4},
        "COMPLETED": {icon: "bi-patch-check-fill", label: "Completed", timelineStep: 5},
        "CANCELED": {icon: "bi-x-circle", label: "Canceled", timelineStep: -1},
    };

    const delivery = deliveryMap[deliveryStatus] || {
        icon: "bi-clock",
        label: deliveryStatus || "Pending",
        timelineStep: 0
    };

    //Product images
    const items = order.items || [];
    const allReviewed = items.every(item => item.reviewed);

    const imgCount = Math.min(items.length, 3);
    const extra = items.length - 3;

    let productImgs = items.slice(0, 3).map(item => {
        const img = item.images && item.images.length > 0
            ? "assets/images/productImg/" + item.images[0]
            : "assets/images/default.png";
        return `<img src="${img}" alt="${item.productTitle}" loading="lazy"
                     title="${item.productTitle}"
                     style="width:52px;height:52px;object-fit:cover;border-radius:8px;
                            border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.1);">`;
    }).join("");

    if (extra > 0) {
        productImgs += `<div style="width:52px;height:52px;border-radius:8px;
                                    background:color-mix(in srgb,var(--accent-color),transparent 88%);
                                    display:inline-flex;align-items:center;justify-content:center;
                                    font-size:13px;font-weight:700;color:var(--accent-color);
                                    border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.1);">
                            +${extra}
                         </div>`;
    }

    const totalItems = items.reduce((sum, i) => sum + i.qty, 0);
    const subtotal = items.reduce((sum, i) => sum + (i.price * i.qty), 0);

    //Address
    const hasAddress = order.lineOne;
    const addressHtml = hasAddress
        ? `${order.firstName} ${order.lastName}<br>
           ${order.lineOne}${order.lineTwo ? ", " + order.lineTwo : ""}<br>
           ${order.city}, ${order.postalCode}<br>
           ${order.province || ""}<br>
           <span style="color:var(--accent-color);">${order.mobile || ""}</span>`
        : `<span class="text-muted">No address on record</span>`;

     const reviewOptions = items.map(item => `
               <option value="${item.orderItemId}">
                    ${item.productTitle}
               </option>
     `).join("");
     console.log(items);
    //Items
    const itemRows = items.map(item => {
        const img = item.images && item.images.length > 0
            ? "assets/images/productImg/" + item.images[0]
            : "assets/images/default.png";
        return `
        <div class="item" style="display:flex;align-items:center;gap:14px;
                                  padding:10px 0;border-bottom:1px solid #f0f0f0;">
            <img src="${img}" alt="${item.productTitle}"
                 style="width:54px;height:54px;object-fit:cover;border-radius:8px;flex-shrink:0;">
            <div style="flex:1;min-width:0;">
                <div style="font-weight:600;font-size:14px;
                            white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                    ${item.productTitle}
                </div>
                <div style="font-size:12px;color:#6c757d;margin-top:2px;">
                    ${item.sizeValue ? `Size: <strong>${item.sizeValue}</strong> &nbsp;|&nbsp;` : ""}
                    Qty: <strong>${item.qty}</strong>
                </div>
            </div>
            <div style="font-weight:700;font-size:14px;color:var(--accent-color);flex-shrink:0;">
                Rs. ${(item.price * item.qty).toFixed(2)}
            </div>
        </div>`;
    }).join("");

    //Timeline
    const timelineSteps = [
        {icon: "bi-bag-check", label: "Order Placed", desc: "Your order has been received"},
        {icon: "bi-check-circle", label: "Approved", desc: "Order approved for processing"},
        {icon: "bi-box-seam", label: "Packing", desc: "Items being packed for shipment"},
        {icon: "bi-truck", label: "In Transit", desc: "Order is on its way"},
        {icon: "bi-house-door", label: "Delivered", desc: "Delivered to your address"},
        {icon: "bi-patch-check-fill", label: "Completed", desc: "Order completed!"},
    ];

    const isCancelled = delivery.timelineStep < 0;
    const isPending = order.status === "PENDING";
    const showBuyNow = isCancelled || isPending;
    const isDelivered = deliveryStatus === "COMPLETED";

    const timelineHtml = isCancelled
        ? `<div style="text-align:center;padding:20px;color:#dc3545;">
               <i class="bi bi-x-circle-fill" style="font-size:32px;"></i>
               <p class="mt-2 mb-0 fw-semibold">This order was ${delivery.label.toLowerCase()}.</p>
           </div>`
        : timelineSteps.map((step, i) => {
            const isDone = i < delivery.timelineStep;
            const isActive = i === delivery.timelineStep;
            const color = isDone ? "var(--accent-color)" : isActive ? "#198754" : "#dee2e6";
            const textCol = isDone || isActive ? "var(--heading-color)" : "#adb5bd";
            return `
            <div class="timeline-item ${isDone ? "completed" : isActive ? "active" : ""}"
                 style="display:flex;gap:14px;margin-bottom:${i < timelineSteps.length - 1 ? "0" : "0"};">
                <div style="display:flex;flex-direction:column;align-items:center;">
                    <div style="width:36px;height:36px;border-radius:50%;
                                background:${isDone ? "var(--accent-color)" : isActive ? "#d1e7dd" : "#f0f0f0"};
                                display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                        <i class="bi ${isDone ? "bi-check-lg" : step.icon}"
                           style="font-size:15px;color:${isDone ? "#fff" : isActive ? "#198754" : "#adb5bd"};"></i>
                    </div>
                    ${i < timelineSteps.length - 1
                ? `<div style="width:2px;flex:1;min-height:28px;
                                       background:${isDone ? "var(--accent-color)" : "#dee2e6"};
                                       margin:4px 0;"></div>`
                : ""}
                </div>
                <div style="padding-bottom:${i < timelineSteps.length - 1 ? "4px" : "0"};padding-top:6px;">
                    <div style="font-weight:${isActive ? "700" : "600"};font-size:14px;color:${textCol};">
                        ${step.label}
                        ${isActive ? `<span style="background:#d1e7dd;color:#0a3622;font-size:11px;
                                               padding:2px 8px;border-radius:999px;margin-left:6px;
                                               font-weight:600;">Current</span>` : ""}
                    </div>
                    <div style="font-size:12px;color:#adb5bd;margin-top:1px;">${step.desc}</div>
                </div>
            </div>`;
        }).join("");

    const delay = (index % 4) * 100;

    const REVIEW_STATUS_MAP = {
        pending: {
            label: "Pending",
            icon: "bi-clock-fill",
            badgeClass: "rv-status-pending",
            cardClass: "rv-card--pending"
        },
        active: {
            label: "Published",
            icon: "bi-patch-check-fill",
            badgeClass: "rv-status-active",
            cardClass: "rv-card--active"
        },
        rejected: {
            label: "Rejected",
            icon: "bi-x-circle-fill",
            badgeClass: "rv-status-rejected",
            cardClass: "rv-card--rejected"
        }
    };

    function normalizeStatus(rawStatus) {
        const NUMERIC_MAP = { 0: "pending", 1: "active", 2: "rejected" };

        if (typeof rawStatus === "number") {
            return NUMERIC_MAP[rawStatus] || "pending";
        }

        if (typeof rawStatus === "string") {
            const normalized = rawStatus.trim().toLowerCase();
            if (REVIEW_STATUS_MAP[normalized]) return normalized;
        }

        // unrecognized value — log it so it doesn't fail silently again
        console.warn("Unrecognized review status:", rawStatus);
        return "pending";
    }

    function getStatusBadge(status) {
        const key = normalizeStatus(status);
        const s = REVIEW_STATUS_MAP[key];
        return `<span class="rv-status-badge ${s.badgeClass}"><i class="bi ${s.icon}"></i> ${s.label}</span>`;
    }

    const reviewCards = items
        .filter(item => item.reviewed)
        .map(item => {
            const review = item.review;

            const stars = Array.from({length: 5}).map((_, i) =>
                i < review.rating
                    ? `<i class="bi bi-star-fill"></i>`
                    : `<i class="bi bi-star"></i>`
            ).join("");

            return `
    <div class="rv-card">
        <div class="rv-header">
            <img
                src="assets/images/productImg/${item.images[0]}"
                class="rv-product-img"
                alt="${item.productTitle}">
            <div class="rv-meta">
                <h4>
                    ${item.productTitle}
                    ${item.sizeValue ? `<span class="rv-size">(${item.sizeValue})</span>` : ""}
                </h4>
                <div class="rv-top-row">
                    <div class="rv-rating">
                        ${stars}
                        <span class="rv-rating-num">${review.rating}.0</span>
                    </div>
                    ${getStatusBadge(review.status)}
                    <span class="rv-date"><i class="bi bi-calendar3"></i> ${review.createdAt}</span>
                </div>
            </div>
        </div>
        <div class="rv-content">
            <h6 class="rv-title">${review.reviewTitle}</h6>
            <p class="rv-text">${review.review}</p>
            ${review.status === "rejected" && review.rejectReason
                ? `<div class="rv-reject-reason"><i class="bi bi-info-circle"></i> ${review.rejectReason}</div>`
                : ""}
        </div>
        <div class="rv-footer">
            <button type="button" class="rv-delete" onclick="deleteReview('${item.id}')">
                <i class="bi bi-trash"></i> Delete
            </button>
        </div>
    </div>
    `;
        }).join("");

    return `
    <div class="order-card" data-aos="fade-up" data-aos-delay="${delay}">

        <!--Header-->
        <div class="order-header" style="display:flex;justify-content:space-between;
                                          align-items:center;flex-wrap:wrap;gap:10px;">
            <div>
                <div style="font-size:13px;color:#6c757d;">Order ID</div>
                <div style="font-weight:700;font-size:15px;color:var(--heading-color);">
                    #${order.orderId}
                </div>
            </div>
            <div style="text-align:right;">
                <span class="badge bg-${pay.cls} bg-opacity-15 text-${pay.cls}"
                      style="font-size:12px;font-weight:600;padding:5px 12px;border-radius:999px;
                             background:color-mix(in srgb,var(--bs-${pay.cls},#6c757d),transparent 85%) !important;
                             color:var(--bs-${pay.cls},#6c757d) !important;">
                    <i class="bi ${pay.icon} me-1"></i>${pay.label}
                </span>
                <div style="font-size:12px;color:#adb5bd;margin-top:4px;">${order.createdAt}</div>
            </div>
        </div>

        <!--Content-->
        <div class="order-content" style="display:flex;align-items:center;gap:20px;
                                           flex-wrap:wrap;margin:16px 0;">

            <div style="display:flex;gap:6px;flex-wrap:wrap;">
                ${productImgs}
            </div>

            <div style="flex:1;min-width:180px;">
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;">
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                                    letter-spacing:0.5px;color:var(--accent-color);margin-bottom:2px;">
                            Items
                        </div>
                        <div style="font-size:14px;font-weight:600;">${totalItems} item${totalItems !== 1 ? "s" : ""}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                                    letter-spacing:0.5px;color:var(--accent-color);margin-bottom:2px;">
                            Delivery
                        </div>
                        <div style="font-size:14px;font-weight:600;">${order.deliveryType || "—"}</div>
                    </div>
                    <div>
                        <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                                    letter-spacing:0.5px;color:var(--accent-color);margin-bottom:2px;">
                            Total
                        </div>
                        <div style="font-size:15px;font-weight:700;color:var(--accent-color);">
                            Rs. ${order.total.toFixed(2)}
                        </div>
                    </div>
                       ${showBuyNow ? `` : `
                    <div>
                          <div style="font-size:11px;font-weight:700;text-transform:uppercase;
                          letter-spacing:0.5px;color:var(--accent-color);margin-bottom:2px;"> Invoice
                    </div>
                    <a href="invoice.html?orderId=${order.orderId}" target="_blank" rel="noopener noreferrer"
                    style="font-size:13px;font-weight:600;color:var(--accent-color); text-decoration:none;">
                    <i class="bi bi-download me-1"></i>View
                    </a>
                </div>`
    }
                </div>
            </div>
        </div>

        <!--buttons-->
        <div class="order-footer" style="display:flex;gap:10px;flex-wrap:wrap;
                                          padding-top:14px;border-top:1px solid
                                          color-mix(in srgb,var(--accent-color),transparent 88%);">
                                          
${showBuyNow ? `

    <button type="button"
        class="btn-track"
        onclick="buyAgain('${order.orderId}')"
        style="flex:1;min-width:120px;background:#198754;">
        <i class="bi bi-cart-plus me-1"></i>Buy Again
    </button>

` : isDelivered ? `

    <button type="button"
        class="btn-track"
        data-bs-toggle="collapse"
        data-bs-target="#tracking${order.orderId}"
        style="flex:1;min-width:120px;">
        <i class="bi bi-geo-alt me-1"></i>Track Order
    </button>

    <button type="button"
        class="btn-details"
        data-bs-toggle="collapse"
        data-bs-target="#details${order.orderId}"
        style="flex:1;min-width:120px;">
        <i class="bi bi-list-ul me-1"></i>View Details
    </button>

    <button type="button"
        class="btn-review"
        data-bs-toggle="collapse"
        data-bs-target="#review${order.orderId}"
        style="flex:1;min-width:120px;background:#ffc107;color:#000;">
        <i class="bi bi-star me-1"></i>Review
    </button>

` : `

    <button type="button"
        class="btn-track"
        data-bs-toggle="collapse"
        data-bs-target="#tracking${order.orderId}"
        style="flex:1;min-width:120px;">
        <i class="bi bi-geo-alt me-1"></i>Track Order
    </button>

    <button type="button"
        class="btn-details"
        data-bs-toggle="collapse"
        data-bs-target="#details${order.orderId}"
        style="flex:1;min-width:120px;">
        <i class="bi bi-list-ul me-1"></i>View Details
    </button>

`}
        </div>

        <!--Tracking-->
        <div class="collapse tracking-info" id="tracking${order.orderId}">
            <div class="tracking-timeline" style="padding:20px 10px 10px;">
                <h6 style="font-weight:700;margin-bottom:18px;color:var(--heading-color);">
                    <i class="bi bi-geo-alt-fill me-2" style="color:var(--accent-color);"></i>
                    Order Tracking
                </h6>
                ${timelineHtml}
            </div>
        </div>

        <!--Deatils-->
        <div class="collapse order-details" id="details${order.orderId}">
            <div class="details-content" style="padding:20px 0 10px;">

                <!--Items-->
                <div class="detail-section" style="margin-bottom:20px;">
                    <h6 style="font-weight:700;margin-bottom:12px;color:var(--heading-color);">
                        <i class="bi bi-bag me-2" style="color:var(--accent-color);"></i>
                        Items (${totalItems})
                    </h6>
                    <div class="order-items">${itemRows}</div>
                </div>

                <!--Price-->
                <div class="detail-section" style="margin-bottom:20px;">
                    <h6 style="font-weight:700;margin-bottom:12px;color:var(--heading-color);">
                        <i class="bi bi-calculator me-2" style="color:var(--accent-color);"></i>
                        Price Details
                    </h6>
                    <div style="background:color-mix(in srgb,var(--accent-color),transparent 95%);
                                border-radius:10px;padding:14px 16px;">
                        <div class="price-breakdown">
                            <div style="display:flex;justify-content:space-between;
                                        padding:5px 0;font-size:14px;">
                                <span style="color:#6c757d;">Subtotal</span>
                                <span style="font-weight:600;">Rs. ${subtotal.toFixed(2)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;
                                        padding:5px 0;font-size:14px;">
                                <span style="color:#6c757d;">Delivery (${order.deliveryType || "—"})</span>
                                <span style="font-weight:600;">Rs. ${(order.deliveryPrice || 0).toFixed(2)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;
                                        padding:5px 0;font-size:14px;">
                                <span style="color:#6c757d;">Tax (3.5%)</span>
                                <span style="font-weight:600;">Rs. ${(subtotal * 0.035).toFixed(2)}</span>
                            </div>
                            <div style="display:flex;justify-content:space-between;
                                        padding:10px 0 5px;font-size:15px;font-weight:700;
                                        border-top:1px dashed color-mix(in srgb,var(--accent-color),transparent 70%);
                                        margin-top:5px;">
                                <span style="color:var(--heading-color);">Total</span>
                                <span style="color:var(--accent-color);">Rs. ${order.total.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!--Address-->
                ${hasAddress ? `
                <div class="detail-section">
                    <h6 style="font-weight:700;margin-bottom:12px;color:var(--heading-color);">
                        <i class="bi bi-geo-alt me-2" style="color:var(--accent-color);"></i>
                        Shipping Address
                    </h6>
                    <div style="background:color-mix(in srgb,var(--accent-color),transparent 95%);
                                border-radius:10px;padding:14px 16px;font-size:14px;line-height:1.7;">
                        ${addressHtml}
                    </div>
                </div>` : ""}

            </div>
        </div>
        
        <!--Reviews-->
        <div class="collapse tracking-info" id="review${order.orderId}">
             <div class="pr-form-card" id="writeReview">
             ${
            allReviewed
             ?`
              <div class="reviews-grid">
                  ${reviewCards}
              </div>
              `
              :`<h4>Write a review</h4>
                 <p class="pr-form-sub">Share your experience to help other shoppers decide.</p>
                <form class="pr-form">
                    <label>Your rating</label>
                    <div class="pr-star-input">
                           <input type="radio" id="star5_${order.orderId}" name="rating${order.orderId}" value="5">
                           <label for="star5_${order.orderId}"" title="5 stars"><i class="bi bi-star-fill"></i></label>
                           <input type="radio" id="star4_${order.orderId}" name="rating${order.orderId}" value="4">
                           <label for="star4_${order.orderId}" title="4 stars"><i class="bi bi-star-fill"></i></label>
                           <input type="radio" id="star3_${order.orderId}" name="rating${order.orderId}" value="3">
                           <label for="star3_${order.orderId}" title="3 stars"><i class="bi bi-star-fill"></i></label>
                           <input type="radio" id="star2_${order.orderId}" name="rating${order.orderId}" value="2">
                           <label for="star2_${order.orderId}" title="2 stars"><i class="bi bi-star-fill"></i></label>
                           <input type="radio" id="star1_${order.orderId}" name="rating${order.orderId}" value="1">
                           <label for="star1_${order.orderId}" title="1 star"><i class="bi bi-star-fill"></i></label>
                    </div>

                    <div class="pr-form-grid">
                          <div>
                              <label for="pr-review-title">Review title</label>
                                   <input type="text" class="form-control" id="reviewTitle${order.orderId}" required>
                          </div>
                          <div>
                              <label for="pr-review-fit">Product</label>
                                  <select class="form-control" id="reviewProduct${order.orderId}">
                                      <option value="">Select Product</option>
                                              ${reviewOptions}
                                  </select>
                                                </div>
                          </div>
                          <div style="margin-bottom:0;">
                             <label for="pr-review-content">Your review</label>
                             <textarea class="form-control" id="reviewMsg${order.orderId}" rows="4" required
                                                          style="margin-bottom:18px;"></textarea>
                          </div>
                          <button type="button" class="btn btn-primary" onclick="submitReview('${order.orderId}');">Submit review</button>
                </form>`}
             </div>
        </div>

    </div>`;
}

async function submitReview(orderId) {

    const title = document.getElementById(`reviewTitle${orderId}`).value;
    const review = document.getElementById(`reviewMsg${orderId}`).value;
    const orderItemId = document.getElementById(`reviewProduct${orderId}`).value;
    const rating = document.querySelector(`input[name="rating${orderId}"]:checked`)?.value;
    const reviewData = {
        orderId: orderId,
        orderItemId: orderItemId,
        rating: rating,
        reviewTitle: title,
        review: review
    };

    const response = await fetch("api/reviews", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(reviewData)
    });

    if (response.ok) {
        const data = await response.json();
        if (data.status) {
            Notiflix.Report.success(
                'Flex Zone',
                data.message,
                'Okay'
            );
            await loadOrderCard();
        } else {
            Notiflix.Notify.failure(data.message, {position: "center-top"});
        }
    } else {
        Notiflix.Notify.failure("Failed to add review. Please try again!", {position: "center-top"});
    }

}

async function setupPagination(totalCount) {

    const container = document.getElementById("paginationContainer");
    const totalPages = Math.ceil(totalCount / ordersPerPage);

    if (totalPages <= 1) {
        container.style.display = "none";
        return;
    }

    container.style.display = "";

    container.innerHTML = `
        <button type="button" class="btn-prev">
            <i class="bi bi-chevron-left"></i>
        </button>
        <div class="page-numbers"></div>
        <button type="button" class="btn-next">
            <i class="bi bi-chevron-right"></i>
        </button>
    `;

    const pageNumbers = container.querySelector(".page-numbers");
    const prevBtn = container.querySelector(".btn-prev");
    const nextBtn = container.querySelector(".btn-next");

    //Prev button ──
    prevBtn.disabled = currentPage === 0;
    prevBtn.onclick = () => {
        if (currentPage > 0) {
            currentPage--;
            renderOrderPage();
            setupPagination(allOrders.length);
        }
    };

    //Next button ──
    nextBtn.disabled = currentPage === totalPages - 1;
    nextBtn.onclick = () => {
        if (currentPage < totalPages - 1) {
            currentPage++;
            renderOrderPage();
            setupPagination(allOrders.length);
        }
    };

    let start = Math.max(0, currentPage - 1);
    let end = Math.min(totalPages - 1, currentPage + 1);

    if (start > 0) {
        addPageButton(0);
        if (start > 1) addDots();
    }

    // Middle pages
    for (let i = start; i <= end; i++) {
        addPageButton(i);
    }

    if (end < totalPages - 1) {
        if (end < totalPages - 2) addDots();
        addPageButton(totalPages - 1);
    }

    function addPageButton(i) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.textContent = i + 1;
        if (i === currentPage) btn.classList.add("active");
        btn.onclick = () => {
            currentPage = i;
            renderOrderPage();
            setupPagination(allOrders.length);
        };
        pageNumbers.appendChild(btn);
    }

    function addDots() {
        const span = document.createElement("span");
        span.textContent = "...";
        pageNumbers.appendChild(span);
    }
}

function showEmptyOrders(container, message) {
    container.innerHTML = `
        <div class="text-center py-5">
            <div style="width:80px;height:80px;
                        background:color-mix(in srgb,var(--accent-color),transparent 90%);
                        border-radius:50%;display:inline-flex;align-items:center;
                        justify-content:center;margin-bottom:16px;">
                <i class="bi bi-bag-x" style="font-size:36px;color:var(--accent-color);"></i>
            </div>
            <h5 class="fw-bold mb-2">No orders yet</h5>
            <p class="text-muted mb-4" style="max-width:280px;margin:0 auto 16px;">
                ${message || "You haven't placed any orders yet. Start shopping!"}
            </p>
            <a href="index.html"
               style="display:inline-flex;align-items:center;gap:8px;
                      background:var(--accent-color);color:#fff;
                      padding:10px 22px;border-radius:10px;font-weight:600;
                      font-size:14px;text-decoration:none;">
                <i class="bi bi-bag"></i> Start Shopping
            </a>
        </div>`;
}

async function loadOrderCount() {
    try {
        const response = await fetch("api/orders/count");
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById("orderTabCount");
            if (badge) badge.textContent = data.count || 0;
        }
    } catch (e) {
        console.error("Order count failed:", e.message);
    }
}