// ─────────────────────────────────────────────
//  ON PAGE LOAD
// ─────────────────────────────────────────────
window.addEventListener("load", async () => {
    try {
        Notiflix.Loading.pulse("Loading checkout...", {
            clickToClose: false,
            svgColor: '#0284c7'
        });
        await loadCheckoutData();
    } finally {
        Notiflix.Loading.remove();
    }
});


// ─────────────────────────────────────────────
//  LOAD CHECKOUT DATA FROM BACKEND
// ─────────────────────────────────────────────
async function loadCheckoutData() {
    try {
        const response = await fetch("api/checkouts/checkout-data");

        // AuthFilter redirects unauthenticated users
        if (response.redirected || !response.ok) {
            document.querySelector(".main")?.style.setProperty("display", "none");
            Notiflix.Report.info('Login Required', 'Please login first!', 'OK', () => {
                window.location = "sign-in.html";
            });
            return;
        }

        const data = await response.json();

        if (!data.status) {
            Notiflix.Notify.failure(data.message, {position: 'center-top'});
            return;
        }

        // ── Step 1: Prefill Customer Info from session user ──
        prefillCustomerInfo(data);

        // ── Step 2: Fill province dropdown ──
        fillProvinceDropdown(data.provinces);

        // ── Step 3: Show saved address banner if one exists ──
        if (data.primaryAddress) {
            fillPrimaryAddress(data.primaryAddress);
        }

        // ── Step 4: Build delivery radio buttons ──
        buildDeliveryOptions(data.deliveryTypes);

        // ── Step 5: Build order summary with real cart items ──
        buildOrderSummary(data.cartItems, data.deliveryTypes);

    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: 'center-top'});
    }
}


// ─────────────────────────────────────────────
//  PREFILL CUSTOMER INFO (email from session)
// ─────────────────────────────────────────────
function prefillCustomerInfo(data) {
    // primaryAddress has firstName/lastName; email comes from session via /api/header
    if (data.primaryAddress) {
        setValue("first-name", data.primaryAddress.firstName || "");
        setValue("last-name", data.primaryAddress.lastName || "");
    }
    // Prefill email from header session endpoint
    fetch("api/header")
        .then(r => r.json())
        .then(headerData => {
            if (headerData.logged && headerData.email) {
                setValue("email", headerData.email);
            }
        })
        .catch(() => {
        }); // silently ignore if not available
}


// ─────────────────────────────────────────────
//  FILL PROVINCE DROPDOWN
// ─────────────────────────────────────────────
function fillProvinceDropdown(provinces) {
    const select = document.getElementById("province");
    if (!select) return;
    select.innerHTML = `<option value="0">Select Province</option>`;
    provinces.forEach(p => {
        select.innerHTML += `<option value="${p.pid}">${p.provinces}</option>`;
    });
}


// ─────────────────────────────────────────────
//  SHOW SAVED ADDRESS BANNER + WIRE CHECKBOX
// ─────────────────────────────────────────────
function fillPrimaryAddress(address) {
    const savedAddressSection = document.getElementById("savedAddressSection");
    if (savedAddressSection) savedAddressSection.style.display = "block";

    const savedAddressText = document.getElementById("savedAddressText");
    if (savedAddressText) {
        savedAddressText.textContent =
            `${address.firstName} ${address.lastName} | ${address.lineOne}, ${address.city}, ${address.postalCode} | ${address.mobile}`;
    }

    const checkbox = document.getElementById("useSavedAddress");
    if (checkbox) {
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) {
                setFormValues(address);
                disableForm(true);
            } else {
                clearForm();
                disableForm(false);
            }
        });
    }
}

function setFormValues(address) {
    setValue("first-name", address.firstName || "");
    setValue("last-name", address.lastName || "");
    setValue("line-one", address.lineOne || "");
    setValue("line-two", address.lineTwo || "");
    setValue("city", address.city || "");
    setValue("postal-code", address.postalCode || "");
    setValue("mobile", address.mobile || "");

    const provinceSelect = document.getElementById("province");
    if (provinceSelect) provinceSelect.value = address.provinceId || 0;
}

function clearForm() {
    ["first-name", "last-name", "line-one", "line-two",
        "city", "postal-code", "mobile"].forEach(id => setValue(id, ""));
    const provinceSelect = document.getElementById("province");
    if (provinceSelect) provinceSelect.value = 0;
}

function disableForm(disabled) {
    ["first-name", "last-name", "line-one", "line-two",
        "city", "postal-code", "mobile", "province"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = disabled;
    });
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val;
}

function buildDeliveryOptions(deliveryTypes) {
    const container = document.getElementById("deliveryOptions");
    if (!container) return;
    container.innerHTML = "";

    deliveryTypes.forEach((dt, index) => {
        container.innerHTML += `
            <div class="form-check mb-2">
                <input class="form-check-input" type="radio"
                       name="deliveryType"
                       id="dt_${dt.id}"
                       value="${dt.id}"
                       data-price="${dt.price}"
                       ${index === 0 ? "checked" : ""}>
                <label class="form-check-label" for="dt_${dt.id}">
                    ${dt.name} &mdash; Rs. ${dt.price.toFixed(2)}
                </label>
            </div>`;
    });

    container.querySelectorAll('input[name="deliveryType"]').forEach(radio => {
        radio.addEventListener("change", recalculateSummary);
    });
}

let checkoutCartItems = [];

function buildOrderSummary(cartItems, deliveryTypes) {
    checkoutCartItems = cartItems;

    const countEl = document.getElementById("cartItemCount");
    if (countEl) countEl.textContent = `${cartItems.length} Item${cartItems.length !== 1 ? 's' : ''}`;

    const container = document.getElementById("orderItemsList");
    if (!container) return;
    container.innerHTML = "";

    cartItems.forEach(cart => {
        const image = cart.images && cart.images.length > 0
            ? "assets/images/" + cart.images[0]
            : "assets/images/default.png";

        const subtotal = (cart.price * cart.qty).toFixed(2);

        container.innerHTML += `
            <div class="order-item d-flex align-items-center mb-3 gap-3">
                <div class="order-item-image">
                    <img src="${image}" alt="${cart.productTitle}"
                         style="width:60px; height:60px; object-fit:cover;
                                border-radius:8px; border:1px solid #eee;">
                </div>
                <div class="order-item-details flex-grow-1">
                    <h4 style="font-size:14px; font-weight:600; margin-bottom:2px;">
                        ${cart.productTitle}
                    </h4>
                    <p class="order-item-variant text-muted mb-1" style="font-size:12px;">
                        Color: ${cart.colorValue || 'N/A'} &nbsp;|&nbsp; Size: ${cart.sizeValue || 'N/A'}
                    </p>
                    <div class="order-item-price" style="font-size:13px;">
                        <span class="quantity text-muted">${cart.qty} &times;</span>
                        <span class="price fw-semibold ms-1">Rs. ${cart.price.toFixed(2)}</span>
                    </div>
                </div>
                <div class="fw-semibold" style="font-size:14px; white-space:nowrap;">
                    Rs. ${subtotal}
                </div>
            </div>`;
    });

    recalculateSummary();
}

function recalculateSummary() {
    let subtotal = 0;
    checkoutCartItems.forEach(c => {
        subtotal += c.price * c.qty;
    });

    const selectedRadio = document.querySelector('input[name="deliveryType"]:checked');
    const shippingCost = selectedRadio ? parseFloat(selectedRadio.getAttribute("data-price")) : 0;

    const TAX_RATE = 0.03;
    const tax = subtotal * TAX_RATE;
    const total = subtotal + shippingCost + tax;

    setTextContent("summarySubtotal", `Rs. ${subtotal.toFixed(2)}`);
    setTextContent("summaryShipping", `Rs. ${shippingCost.toFixed(2)}`);
    setTextContent("summaryTax", `Rs. ${tax.toFixed(2)}`);
    setTextContent("summaryTotal", `Rs. ${total.toFixed(2)}`);

    setTextContent("btnTotalPrice", `Rs. ${total.toFixed(2)}`);
}

function setTextContent(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

async function placeOrder() {

    // ── Terms check ──
    const termsChecked = document.getElementById("terms")?.checked;
    if (!termsChecked) {
        Notiflix.Notify.warning("Please agree to the Terms and Conditions.", {position: 'center-top'});
        return;
    }

    const useSaved = document.getElementById("useSavedAddress")?.checked || false;
    const firstName = document.getElementById("first-name")?.value.trim() || "";
    const lastName = document.getElementById("last-name")?.value.trim() || "";
    const lineOne = document.getElementById("line-one")?.value.trim() || "";
    const lineTwo = document.getElementById("line-two")?.value.trim() || "";
    const city = document.getElementById("city")?.value.trim() || "";
    const postalCode = document.getElementById("postal-code")?.value.trim() || "";
    const mobile = document.getElementById("mobile")?.value.trim() || "";
    const provinceId = parseInt(document.getElementById("province")?.value) || 0;

    const selectedDelivery = document.querySelector('input[name="deliveryType"]:checked');
    if (!selectedDelivery) {
        Notiflix.Notify.warning("Please select a delivery type.", {position: 'center-top'});
        return;
    }

    const checkoutData = {
        isCurrentAddress: useSaved,
        firstName,
        lastName,
        lineOne,
        lineTwo,
        city,
        postalCode,
        mobile,
        provinceId,
        deliveryTypeId: parseInt(selectedDelivery.value)
    };

    try {
        Notiflix.Loading.pulse("Placing order...", {clickToClose: false, svgColor: '#0284c7'});

        const response = await fetch("api/checkouts/place-order", {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify(checkoutData)
        });

        if (response.ok) {
            const data = await response.json();
            if (data.status) {
                Notiflix.Report.success(
                    'Order Placed!',
                    `Your order #${data.orderId} has been placed successfully.`,
                    'OK',
                    () => {
                        window.location = "account.html";
                    }
                );
            } else {
                Notiflix.Notify.failure(data.message, {position: 'center-top'});
            }
        } else {
            Notiflix.Notify.failure("Order placement failed!", {position: 'center-top'});
        }
    } catch (e) {
        Notiflix.Notify.failure(e.message, {position: 'center-top'});
    } finally {
        Notiflix.Loading.remove();
    }
}