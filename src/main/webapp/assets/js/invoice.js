async function loadInvoice() {
    const params  = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");

    if (!orderId) {
        Notiflix.Notify.failure("No order ID found.", { position: "center-top" });
        return;
    }

    try {
        const response = await fetch(`api/orders/invoice?orderId=${orderId}`);

        if (response.redirected) {
            document.querySelector(".main")?.style.setProperty("display", "none");
            Notiflix.Report.info('Login Required', 'Please login first!', 'OK', () => {
                window.location = "sign-in.html";
            });
            return;
        }else if(!response.ok){
            Notiflix.Notify.failure("Failed to load invoice.", { position: "center-top" });
            return;
        }

        const data = await response.json();

        if (!data.status && data.message === "Unauthorized!") {
            window.location.href = "index.html";
            return;
        }

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            return;
        }

        renderInvoice(data.order);

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    }
}

function renderInvoice(order) {
    // Banner
    document.getElementById("bannerOrderId").textContent = "Order #" + order.orderId;

    // Header
    document.getElementById("invoiceOrderId").textContent = "Order #" + order.orderId;
    document.getElementById("invoiceDate").textContent    = "Date: " + order.createdAt;

    // Billed to
    document.getElementById("customerName").textContent  = order.firstName + " " + order.lastName;
    document.getElementById("customerEmail").textContent = order.email;
    document.getElementById("customerPhone").textContent = order.mobile;

    // Ship to
    document.getElementById("shippingAddress").innerHTML =
        `${order.lineOne}<br>
         ${order.lineTwo ? order.lineTwo + "<br>" : ""}
         ${order.city}, ${order.postalCode}<br>
         ${order.province || ""}`;

    document.getElementById("deliveryType").textContent = order.deliveryType || "—";

    // Items table
    const tbody = document.getElementById("invoiceItemsBody");
    tbody.innerHTML = "";

    let subtotal = 0;

    order.items.forEach((item, index) => {
        const image    = item.images && item.images.length > 0
            ? "assets/images/" + item.images[0]
            : "assets/images/default.png";
        const itemTotal = item.price * item.qty;
        subtotal += itemTotal;

        tbody.innerHTML += `
            <tr>
                <td class="text-muted">${index + 1}</td>
                <td>
                    <div class="d-flex align-items-center gap-3">
                        <img src="${image}" alt="${item.productTitle}" class="product-img">
                        <div>
                            <div class="product-name">${item.productTitle}</div>
                            <div class="product-meta">SKU: STK-${item.stockId}</div>
                        </div>
                    </div>
                </td>
                <td class="text-center">${item.sizeValue || "—"}</td>
                <td class="text-center">${item.qty}</td>
                <td class="text-end">Rs. ${item.price.toFixed(2)}</td>
                <td class="text-end fw-semibold">Rs. ${itemTotal.toFixed(2)}</td>
            </tr>`;
    });

    // Summary
    const deliveryCost = order.deliveryPrice || 0;
    const TAX_RATE     = 0.035;
    const tax          = subtotal * TAX_RATE;
    const discount     = order.discount || 0;
    const total        = subtotal + deliveryCost + tax - discount;

    document.getElementById("invoiceSubtotal").textContent = `Rs. ${subtotal.toFixed(2)}`;
    document.getElementById("invoiceDelivery").textContent = `Rs. ${deliveryCost.toFixed(2)}`;
    document.getElementById("invoiceTax").textContent      = `Rs. ${tax.toFixed(2)}`;
    document.getElementById("invoiceDiscount").textContent = `-Rs. ${discount.toFixed(2)}`;
    document.getElementById("invoiceTotal").textContent    = `Rs. ${total.toFixed(2)}`;
}