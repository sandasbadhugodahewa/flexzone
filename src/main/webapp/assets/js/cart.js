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
