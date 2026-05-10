window.addEventListener("load", async () => {
    await loadAdminInvoice();
    wireDeliverySelect();
});

function copyEmail(email) {
    navigator.clipboard.writeText(email);
    Notiflix.Notify.success("Copied!", { position: "right-top" });
}

const PAYMENT_STATUS = {
    PAID:    { cls: "paid",    icon: "bi-check-circle-fill",  label: "Paid" },
    PENDING: { cls: "pending", icon: "bi-clock-fill",         label: "Pending" },
    BLOCKED: { cls: "failed",  icon: "bi-x-circle-fill",      label: "Failed" },
};

const DELIVERY_STATUS = {
    APPROVED:  { cls: "approved",  icon: "bi-check2-circle",  label: "Approved",  order: 1 },
    PACKING:   { cls: "packing",   icon: "bi-box-seam-fill",  label: "Packing",   order: 2 },
    SHIPPED:   { cls: "shipped",   icon: "bi-truck",          label: "Shipped",   order: 3 },
    DELIVERED: { cls: "delivered", icon: "bi-house-check",    label: "Delivered", order: 4 },
    COMPLETED: { cls: "completed", icon: "bi-award-fill",     label: "Completed", order: 5 },
    CANCELED:  { cls: "canceled",  icon: "bi-slash-circle",   label: "Canceled",  order: 0 },
};

const DELIVERY_STEPS = ["APPROVED","PACKING","SHIPPED","DELIVERED","COMPLETED"];

async function loadAdminInvoice() {
    const params  = new URLSearchParams(window.location.search);
    const orderId = params.get("orderId");

    if (!orderId) {
        Notiflix.Notify.failure("No order ID provided!", { position: "center-top" });
        return;
    }

    try {
        Notiflix.Loading.pulse("Loading invoice...", { svgColor: "#6c5ce7" });

        const res  = await fetch(`api/admin/invoices/detail?orderId=${orderId}`);
        const data = await res.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
            return;
        }

        renderInvoice(data.order);

    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}

function renderInvoice(order) {

    //Page title + breadcrumb
    document.title = `Invoice ${order.orderId} | FlexZone Admin`;
    setText(".page-title",          `Invoice ${order.orderId}`);
    setText(".breadcrumb-item.active", order.orderId);

    //Invoice header
    setText("#invoiceNumber",   order.orderId);
    setText("#invoiceDate",     order.createdAt);
    setText("#invoiceUpdated",  order.updatedAt || "—");

    //Bill t ──
    setText("#clientName",   `${order.firstName} ${order.lastName}`);
    setText("#clientEmail",  order.email);
    setText("#clientPhone",  order.mobile || "—");
    setText("#clientAddr",
        [order.lineOne, order.lineTwo, order.city, order.postalCode, order.province]
            .filter(Boolean).join(", "));

    renderPaymentBadge(order.status);

    //Delivery type
    setText("#deliveryTypeName",
        (order.deliveryType || "—") + " — Rs. " + (order.deliveryPrice || 0).toFixed(2));

    //Items table
    renderItems(order);

    //Delivery timeline
    renderTimeline(order.deliveryStatus);

    //Client card
    const initials = ((order.firstName?.[0] || "") + (order.lastName?.[0] || "")).toUpperCase();
    setText("#clientCardName",   `${order.firstName} ${order.lastName}`);
    setText("#clientCardEmail",  order.email);
    setHTML("#clientCardAvatar", initials);

    //Activity log
    renderActivity(order);

    // ── Pre-select delivery dropdown ──
    const sel = document.querySelector(".inv-filter");
    if (sel && order.deliveryStatus) sel.value = order.deliveryStatus;

    window._currentOrderId = order.orderId;
}

//Payment badge
function renderPaymentBadge(status) {
    const cfg = PAYMENT_STATUS[status] || { cls: "pending", icon: "bi-clock", label: status };
    const el  = document.getElementById("paymentStatusBadge");
    if (!el) return;
    el.className = `payment-badge-large ${cfg.cls}`;
    el.innerHTML = `<i class="bi ${cfg.icon}"></i> ${cfg.label}`;
}

function renderItems(order) {
    const tbody = document.getElementById("invoiceItemsBody");
    if (!tbody) return;

    let subtotal = 0;
    tbody.innerHTML = (order.items || []).map((item, i) => {
        const img      = item.images?.[0]
            ? `assets/images/productImg/${item.images[0]}`
            : `assets/images/default.png`;
        const lineTotal = item.price * item.qty;
        subtotal += lineTotal;
        return `
        <tr>
            <td>
                <div class="d-flex align-items-center gap-3">
                    <img src="${img}" alt="${item.productTitle}"
                         style="width:44px;height:44px;object-fit:cover;border-radius:8px;
                                border:1px solid var(--border-color);"
                         onerror="this.src='assets/images/default.png'">
                    <div>
                        <div style="font-weight:600;font-size:13px;">${item.productTitle}</div>
                        <div style="font-size:11px;color:var(--muted-color);">
                            SKU: STK-${item.stockId}
                            ${item.sizeValue ? " · Size: " + item.sizeValue : ""}
                        </div>
                    </div>
                </div>
            </td>
            <td class="text-center">${item.qty}</td>
            <td class="text-end">Rs. ${item.price.toFixed(2)}</td>
            <td class="text-end fw-semibold">Rs. ${lineTotal.toFixed(2)}</td>
        </tr>`;
    }).join("");

    const delivery = order.deliveryPrice || 0;
    const tax      = subtotal * 0.035;
    const total    = order.total || (subtotal + delivery + tax);

    setText("#invSubtotal",  `Rs. ${subtotal.toFixed(2)}`);
    setText("#invDelivery",  `Rs. ${delivery.toFixed(2)}`);
    setText("#invTax",       `Rs. ${tax.toFixed(2)}`);
    setText("#invTotal1",     `Rs. ${total.toFixed(2)}`);
    setText("#invTotal2",     `Rs. ${total.toFixed(2)}`);
}

function renderTimeline(currentDeliveryStatus) {
    const container = document.getElementById("deliveryTimeline");
    if (!container) return;

    const currentOrder = DELIVERY_STATUS[currentDeliveryStatus]?.order || 0;
    const isCanceled   = currentDeliveryStatus === "CANCELED";

    if (isCanceled) {
        container.innerHTML = `
            <div class="delivery-step">
                <div class="step-icon" style="background:#fee2e2;color:#dc2626;border-color:#fca5a5;">
                    <i class="bi bi-slash-circle-fill"></i>
                </div>
                <div class="step-info">
                    <div class="step-label" style="color:#dc2626;">Order Canceled</div>
                    <div class="step-date">This order has been canceled</div>
                </div>
            </div>`;
        return;
    }

    container.innerHTML = DELIVERY_STEPS.map(step => {
        const cfg        = DELIVERY_STATUS[step];
        const stepOrder  = cfg.order;
        const isDone     = stepOrder < currentOrder;
        const isActive   = step === currentDeliveryStatus;
        const isPending  = stepOrder > currentOrder;

        let iconCls, labelCls, badge = "";
        if (isDone) {
            iconCls  = "done-step";
            labelCls = "";
            badge    = `<span class="step-badge done"><i class="bi bi-check2"></i> Done</span>`;
        } else if (isActive) {
            iconCls  = "active-step";
            labelCls = "";
            badge    = `<span class="step-badge current">Current</span>`;
        } else {
            iconCls  = "pending-step";
            labelCls = "muted";
            badge    = "";
        }

        const stepClass = isDone ? "delivery-step done" : "delivery-step";

        return `
        <div class="${stepClass}">
            <div class="step-icon ${iconCls}">
                <i class="bi ${cfg.icon}"></i>
            </div>
            <div class="step-info">
                <div class="d-flex align-items-center gap-2">
                    <span class="step-label ${labelCls}">${cfg.label}</span>
                    ${badge}
                </div>
                <div class="step-date">${isDone ? "Completed" : isActive ? "In progress" : "Waiting"}</div>
            </div>
        </div>`;
    }).join("");
}

function renderActivity(order) {
    const container = document.getElementById("activityLog");
    if (!container) return;

    const ps = PAYMENT_STATUS[order.status] || {};
    const ds = DELIVERY_STATUS[order.deliveryStatus] || {};

    const activities = [
        order.createdAt && {
            dot:  "#9ca3af",
            text: "Order placed",
            time: order.createdAt
        },
        order.status === "PAID" && {
            dot:  "#16a34a",
            text: "Payment confirmed (PAID)",
            time: order.updatedAt || order.createdAt
        },
        order.deliveryStatus && order.deliveryStatus !== "CANCELED" && {
            dot:  "#2563eb",
            text: `Delivery status: ${ds.label || order.deliveryStatus}`,
            time: order.updatedAt || "—"
        },
        order.deliveryStatus === "CANCELED" && {
            dot:  "#dc2626",
            text: "Order canceled",
            time: order.updatedAt || "—"
        },
    ].filter(Boolean).reverse();

    container.innerHTML = activities.map(a => `
        <div class="inv-activity-item">
            <div class="inv-activity-dot" style="background:${a.dot};"></div>
            <div class="inv-activity-content">
                <div class="inv-activity-text">${a.text}</div>
                <div class="inv-activity-time">${a.time}</div>
            </div>
        </div>`).join("");
}

function wireDeliverySelect() {
    const sel = document.querySelector(".inv-filter");
    if (!sel) return;
    sel.addEventListener("change", async () => {
        const newStatus = sel.value;
        if (!newStatus || !window._currentOrderId) return;
        await updateDeliveryStatus(window._currentOrderId, newStatus);
    });
}

async function updateDeliveryStatus(orderId, newStatus) {
    try {
        Notiflix.Loading.pulse("Updating status...", { svgColor: "#6c5ce7" });

        const res  = await fetch(`api/admin/invoices/${orderId}/status`, {
            method:  "PUT",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ status: newStatus })
        });
        const data = await res.json();

        if (data.status) {
            Notiflix.Notify.success(data.message, { position: "center-top" });
            await loadAdminInvoice(); // re-render with new status
        } else {
            Notiflix.Notify.failure(data.message, { position: "center-top" });
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, { position: "center-top" });
    } finally {
        Notiflix.Loading.remove();
    }
}

function setText(selector, val) {
    const el = typeof selector === "string"
        ? document.querySelector(selector) ?? document.getElementById(selector.replace("#",""))
        : selector;
    if (el) el.textContent = val ?? "—";
}
function setHTML(selector, val) {
    const el = document.querySelector(selector) ?? document.getElementById(selector.replace("#",""));
    if (el) el.innerHTML = val ?? "";
}

function printInvoice() {
    const printArea = document.getElementById("printArea");
    if (!printArea) return;

    const win = window.open('', '_blank', 'width=900,height=700');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
    <title>Invoice ${window._currentOrderId || ''}</title>
    <link href="assets/css/bootstrap.min.css" rel="stylesheet">
    <style>
        body {
            font-family: 'Plus Jakarta Sans', sans-serif;
            padding: 30px;
            color: #111827;
        }
        .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 28px;
            padding-bottom: 20px;
            border-bottom: 2px solid #e5e7eb;
        }
        .invoice-title h2 {
            font-size: 28px;
            font-weight: 800;
            color: #6c5ce7;
            margin: 0;
            letter-spacing: 2px;
        }
        .invoice-number {
            font-size: 14px;
            color: #6b7280;
            margin-top: 4px;
        }
        .inv-label {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: #9ca3af;
            margin-bottom: 6px;
        }
        .inv-addr-name {
            font-weight: 700;
            font-size: 15px;
            margin-bottom: 4px;
        }
        .inv-addr-detail {
            font-size: 13px;
            color: #6b7280;
            line-height: 1.7;
        }
        .inv-meta-row {
            display: flex;
            gap: 32px;
            flex-wrap: wrap;
            padding: 16px 0;
            border-top: 1px solid #f3f4f6;
            border-bottom: 1px solid #f3f4f6;
            margin-bottom: 24px;
        }
        .inv-meta-item { display: flex; flex-direction: column; gap: 4px; }
        .inv-meta-value { font-size: 13px; font-weight: 600; color: #111827; }
        .payment-badge-large {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 5px 12px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 700;
        }
        .payment-badge-large.paid    { background: #dcfce7; color: #15803d; }
        .payment-badge-large.pending { background: #fef3c7; color: #b45309; }
        .payment-badge-large.failed  { background: #fee2e2; color: #dc2626; }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 0;
        }
        thead th {
            background: #f8fafc;
            padding: 10px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #64748b;
            border-bottom: 2px solid #e2e8f0;
            text-align: left;
        }
        thead th.text-end { text-align: right; }
        thead th.text-center { text-align: center; }
        tbody td {
            padding: 12px;
            border-bottom: 1px solid #f1f5f9;
            font-size: 13px;
        }
        td.text-end { text-align: right; }
        td.text-center { text-align: center; }
        .product-img-print {
            width: 40px; height: 40px;
            object-fit: cover;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
            vertical-align: middle;
            margin-right: 10px;
        }
        .summary-wrap {
            display: flex;
            justify-content: flex-end;
            margin-top: 16px;
        }
        .summary-table { width: 280px; }
        .summary-table td {
            padding: 6px 8px;
            font-size: 13px;
            border-bottom: none;
        }
        .summary-label { color: #6b7280; }
        .summary-total {
            font-size: 15px;
            font-weight: 700;
            color: #111827;
            border-top: 2px solid #e2e8f0;
            padding-top: 10px;
        }
        .invoice-notes {
            margin-top: 28px;
            padding: 14px 16px;
            background: #f9fafb;
            border-radius: 8px;
            font-size: 13px;
            color: #6b7280;
        }
        .invoice-footer-print {
            margin-top: 28px;
            padding-top: 16px;
            border-top: 1px solid #e5e7eb;
            display: flex;
            justify-content: center;
            gap: 40px;
            font-size: 12px;
            color: #9ca3af;
        }
        .invoice-footer-print span { display: flex; align-items: center; gap: 6px; }
    </style>
</head>
<body>
    ${printArea.innerHTML}
</body>
</html>`);

    win.addEventListener('load', () => {
        setTimeout(() => {
            win.focus();
            win.print();
        }, 500);
    });
}
function downloadInvoicePDF() {
    printInvoice();
    Notiflix.Notify.info(
        "Select 'Save as PDF' in the print dialog to download.",
        { position: "center-top", timeout: 4000 }
    );
}