package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lk.jiat.flexzone.dto.*;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.Env;
import lk.jiat.flexzone.util.HibernateUtil;
import lk.jiat.flexzone.util.PayHereUtil;
import lk.jiat.flexzone.validation.Validator;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

public class CheckoutService {

    public String getCheckoutData(HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            message = "Please login first!";
            responseObject.addProperty("status", status);
            responseObject.addProperty("message", message);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

        try {
            // ── Cart items ──
            List<Cart> cartList = hibernateSession
                    .createQuery("FROM Cart c WHERE c.user.id = :userId", Cart.class)
                    .setParameter("userId", sessionUser.getId())
                    .getResultList();

            if (cartList.isEmpty()) {
                message = "Your cart is empty. Please add items first!";
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", message);
                return AppUtil.GSON.toJson(responseObject);
            }

            // ── Primary address (if exists) ──
            Address primaryAddress = hibernateSession
                    .createQuery("FROM Address a WHERE a.user.id = :userId AND a.isPrimary = true", Address.class)
                    .setParameter("userId", sessionUser.getId())
                    .getSingleResultOrNull();

            if (primaryAddress != null) {
                JsonObject addressJson = new JsonObject();
                addressJson.addProperty("id", primaryAddress.getId());
                addressJson.addProperty("firstName", sessionUser.getFirstName());
                addressJson.addProperty("lastName", sessionUser.getLastName());
                addressJson.addProperty("lineOne", primaryAddress.getLineOne());
                addressJson.addProperty("lineTwo", primaryAddress.getLineTwo() != null ? primaryAddress.getLineTwo() : "");
                addressJson.addProperty("city", primaryAddress.getCity());
                addressJson.addProperty("postalCode", primaryAddress.getPostalCode());
                addressJson.addProperty("mobile", primaryAddress.getMobile());
                if (primaryAddress.getProvince() != null) {
                    addressJson.addProperty("provinceId", primaryAddress.getProvince().getPid());
                    addressJson.addProperty("provinceName", primaryAddress.getProvince().getProvinces());
                }
                responseObject.add("primaryAddress", addressJson);
            }

            // ── Cart DTOs ──
            List<CartDTO> cartDTOs = new CartService().buildCartDTOs(cartList);
            responseObject.add("cartItems", AppUtil.GSON.toJsonTree(cartDTOs));

            // ── Delivery types ──
            List<DeliveryType> deliveryTypes = hibernateSession
                    .createQuery("FROM DeliveryType", DeliveryType.class)
                    .getResultList();
            responseObject.add("deliveryTypes", AppUtil.GSON.toJsonTree(deliveryTypes));

            // ── Provinces ──
            List<Province> provinces = hibernateSession
                    .createQuery("FROM Province", Province.class)
                    .getResultList();
            responseObject.add("provinces", AppUtil.GSON.toJsonTree(provinces));

            status = true;
            message = "Checkout data loaded!";

        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String placeOrder(CheckoutRequestDTO dto, HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Please login first!");
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction = hibernateSession.beginTransaction();

        try {
            User dbUser = hibernateSession.find(User.class, sessionUser.getId());

            // ── 1. Resolve delivery address ──────────────────────────────────
            Address deliveryAddress;

            if (dto.isCurrentAddress()) {
                deliveryAddress = hibernateSession
                        .createQuery("FROM Address a WHERE a.user.id=:uid AND a.isPrimary=true", Address.class)
                        .setParameter("uid", dbUser.getId())
                        .getSingleResultOrNull();

                if (deliveryAddress == null) {
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", "Primary address not found!");
                    return AppUtil.GSON.toJson(responseObject);
                }
            } else {
                if (dto.getFirstName() == null || dto.getFirstName().isBlank()) message = "First name is required!";
                else if (dto.getLastName() == null || dto.getLastName().isBlank()) message = "Last name is required!";
                else if (dto.getLineOne() == null || dto.getLineOne().isBlank())
                    message = "Address line one is required!";
                else if (dto.getCity() == null || dto.getCity().isBlank()) message = "City is required!";
                else if (dto.getPostalCode() == null || dto.getPostalCode().isBlank())
                    message = "Postal code is required!";
                else if (!dto.getPostalCode().matches(Validator.POSTAL_CODE_VALIDATION))
                    message = "Enter a valid postal code!";
                else if (dto.getMobile() == null || dto.getMobile().isBlank()) message = "Mobile number is required!";
                else if (!dto.getMobile().matches(Validator.MOBILE_VALIDATION))
                    message = "Enter a valid mobile number!";
                else message = null;

                if (message != null) {
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", message);
                    return AppUtil.GSON.toJson(responseObject);
                }

                Province province = (dto.getProvinceId() > 0)
                        ? hibernateSession.find(Province.class, dto.getProvinceId()) : null;

                Status activeStatus = hibernateSession
                        .createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", Status.Type.ACTIVE.name())
                        .getSingleResult();

                Address existingPrimary = hibernateSession
                        .createQuery("FROM Address a WHERE a.user.id=:uid AND a.isPrimary=true", Address.class)
                        .setParameter("uid", dbUser.getId())
                        .getSingleResultOrNull();
                if (existingPrimary != null) {
                    existingPrimary.setIsPrimary(false);
                    hibernateSession.merge(existingPrimary);
                }

                deliveryAddress = new Address();
                deliveryAddress.setUser(dbUser);
                deliveryAddress.setLineOne(dto.getLineOne());
                deliveryAddress.setLineTwo(dto.getLineTwo());
                deliveryAddress.setCity(dto.getCity());
                deliveryAddress.setPostalCode(dto.getPostalCode());
                deliveryAddress.setMobile(dto.getMobile());
                deliveryAddress.setProvince(province);
                deliveryAddress.setStatus(activeStatus);
                deliveryAddress.setIsPrimary(true);
                hibernateSession.persist(deliveryAddress);
            }

            // ── 2. Resolve delivery type ──────────────────────────────────────
            DeliveryType deliveryType = hibernateSession.find(DeliveryType.class, dto.getDeliveryTypeId());
            if (deliveryType == null) {
                deliveryType = hibernateSession
                        .createQuery("FROM DeliveryType", DeliveryType.class)
                        .setMaxResults(1).getSingleResult();
            }

            boolean isBuyNow = dto.isBuyNow();
            List<Stock> buyNowStocks = new ArrayList<>();
            List<Integer> buyNowQtys = new ArrayList<>();
            List<Cart> cartList = new ArrayList<>();

            if (isBuyNow) {
                // Buy Now — single stock item, bypass cart
                Stock stock = hibernateSession.find(Stock.class, dto.getBuyNowStockId());
                if (stock == null) {
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", "Product not found!");
                    return AppUtil.GSON.toJson(responseObject);
                }
                if (stock.getQuantity() < dto.getBuyNowQty()) {
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message",
                            "'" + stock.getProduct().getTitle() + "' only has "
                                    + stock.getQuantity() + " left in stock!");
                    return AppUtil.GSON.toJson(responseObject);
                }
                buyNowStocks.add(stock);
                buyNowQtys.add(dto.getBuyNowQty());
            } else {
                // Normal checkout — from cart
                cartList = hibernateSession
                        .createQuery("FROM Cart c WHERE c.user.id=:uid", Cart.class)
                        .setParameter("uid", dbUser.getId())
                        .getResultList();

                if (cartList.isEmpty()) {
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", "Your cart is empty!");
                    return AppUtil.GSON.toJson(responseObject);
                }

                for (Cart cart : cartList) {
                    Stock stock = hibernateSession.find(Stock.class, cart.getStock().getId());
                    if (stock.getQuantity() < cart.getQty()) {
                        transaction.rollback();
                        responseObject.addProperty("status", false);
                        responseObject.addProperty("message",
                                "'" + stock.getProduct().getTitle() + "' only has "
                                        + stock.getQuantity() + " left in stock!");
                        return AppUtil.GSON.toJson(responseObject);
                    }
                    buyNowStocks.add(stock);
                    buyNowQtys.add(cart.getQty());
                }
            }


// ── 4. Calculate totals using the already-validated buyNowStocks list ──
            final double TAX_RATE = 0.035;
            double itemsTotal = 0;
            StringBuilder itemNames = new StringBuilder();

            for (int i = 0; i < buyNowStocks.size(); i++) {
                Stock stock = buyNowStocks.get(i);
                int qty = buyNowQtys.get(i);
                itemsTotal += stock.getPrice() * qty;
                if (!itemNames.isEmpty()) itemNames.append(", ");
                itemNames.append(stock.getProduct().getTitle()).append(" x").append(qty);
            }

            double shippingCost = deliveryType.getPrice();
            double tax = itemsTotal * TAX_RATE;
            double grandTotal = itemsTotal + shippingCost + tax;

            // ── 5. Create PENDING order with order_id + total (fix #1, #2) ────
            Status pendingStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.PENDING.name())
                    .getSingleResult();

// ── Create Order ──
            Order order = new Order();
            order.setUser(dbUser);
            order.setDeliveryType(deliveryType);
            order.setStatus(pendingStatus);
            order.setAddress(deliveryAddress);
            order.setTotal(0);
            order.setDeliveryStatus(null);

// ── FIX: set a temporary orderId before persist ──
// We'll update it after we get the auto-generated id
            order.setOrderId("TEMP");
            hibernateSession.persist(order);
            hibernateSession.flush(); // forces DB insert NOW so we get the generated id

// ── Now generate the real orderId using the DB id ──
            String realOrderId = "FZ" + String.format("%04d", order.getId());
            order.setOrderId(realOrderId);
            hibernateSession.merge(order);

// ── Create OrderItems from Cart ──
            double totalAmount = 0;

            for (int i = 0; i < buyNowStocks.size(); i++) {
                Stock stock = buyNowStocks.get(i);
                int qty = buyNowQtys.get(i);

                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(order);
                orderItem.setStock(stock);
                orderItem.setQty(qty);
                orderItem.setRating(0);

                hibernateSession.persist(orderItem);

                totalAmount += stock.getPrice() * qty;
            }

// Add delivery charge + tax
            double taxRate = Double.parseDouble(Env.get("app.tax.rate")); // e.g. 0.035
            double cTax     = totalAmount * taxRate;
            totalAmount    += deliveryType.getPrice() + cTax;

// Update total on order
            order.setTotal(grandTotal);
            hibernateSession.merge(order);

            transaction.commit(); // pending order saved — no stock deducted yet

            // ── 7. Build PayHere DTO ──────────────────────────────────────────
            String publicUrl = Env.get("app.public.url");

            PayHereDTO payHereDTO = new PayHereDTO();
            payHereDTO.setSandbox(true); // ← set false when going live
            payHereDTO.setMerchant_id(PayHereUtil.getMerchantId());
            payHereDTO.setReturn_url(publicUrl + "/api/payments/return");
            payHereDTO.setCancel_url(publicUrl + "/api/payments/cancel");
            payHereDTO.setNotify_url(publicUrl + "/api/payments/notify");
            payHereDTO.setOrder_id(realOrderId);
            payHereDTO.setItems(itemNames.toString());
            // FIX #3 — grandTotal includes tax, matches checkout page total
            payHereDTO.setAmount(String.format(Locale.US, "%.2f", grandTotal));
            payHereDTO.setCurrency(PayHereUtil.APP_CURRENCY);
            payHereDTO.setHash(PayHereUtil.generateHash(realOrderId, grandTotal));
            payHereDTO.setFirst_name(dbUser.getFirstName());
            payHereDTO.setLast_name(dbUser.getLastName());
            payHereDTO.setEmail(dbUser.getEmail());
            payHereDTO.setPhone(deliveryAddress.getMobile());
            payHereDTO.setAddress(deliveryAddress.getLineOne()
                    + (deliveryAddress.getLineTwo() != null
                    && !deliveryAddress.getLineTwo().isBlank()
                    ? ", " + deliveryAddress.getLineTwo() : ""));
            payHereDTO.setCity(deliveryAddress.getCity() != null ? deliveryAddress.getCity() : "");
            payHereDTO.setCountry(PayHereUtil.APP_COUNTRY);

            responseObject.add("paymentDetails", AppUtil.GSON.toJsonTree(payHereDTO));
            status = true;
            message = "Ready for payment!";

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            message = "Checkout failed. Please try again!";
        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String getBuyNowData(int stockId, int qty, HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Please login first!");
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

        try {
            // Validate the stock item
            Stock stock = hibernateSession.find(Stock.class, stockId);
            if (stock == null) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Product not found!");
                return AppUtil.GSON.toJson(responseObject);
            }
            if (stock.getQuantity() < qty) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Not enough stock available!");
                return AppUtil.GSON.toJson(responseObject);
            }

            // Build a single-item CartDTO so JS can reuse buildOrderSummary()
            CartDTO cartDTO = new CartDTO();
            cartDTO.setCartId(-1); // -1 = not a real cart row
            cartDTO.setStockId(stock.getId());
            cartDTO.setProductId(stock.getProduct().getId());
            cartDTO.setProductTitle(stock.getProduct().getTitle());
            cartDTO.setImages(stock.getProduct().getImages());
            cartDTO.setPrice(stock.getPrice());
            cartDTO.setQty(qty);
            cartDTO.setColorValue(stock.getProduct().getColor().getValue());
            if (stock.getSize() != null) cartDTO.setSizeValue(stock.getSize().getValue());

            List<CartDTO> cartItems = new ArrayList<>();
            cartItems.add(cartDTO);
            responseObject.add("cartItems", AppUtil.GSON.toJsonTree(cartItems));

            // Primary address
            Address primaryAddress = hibernateSession
                    .createQuery("FROM Address a WHERE a.user.id=:uid AND a.isPrimary=true", Address.class)
                    .setParameter("uid", sessionUser.getId())
                    .getSingleResultOrNull();

            if (primaryAddress != null) {
                JsonObject addressJson = new JsonObject();
                addressJson.addProperty("id", primaryAddress.getId());
                addressJson.addProperty("firstName", sessionUser.getFirstName());
                addressJson.addProperty("lastName", sessionUser.getLastName());
                addressJson.addProperty("lineOne", primaryAddress.getLineOne());
                addressJson.addProperty("lineTwo", primaryAddress.getLineTwo() != null ? primaryAddress.getLineTwo() : "");
                addressJson.addProperty("city", primaryAddress.getCity());
                addressJson.addProperty("postalCode", primaryAddress.getPostalCode());
                addressJson.addProperty("mobile", primaryAddress.getMobile());
                if (primaryAddress.getProvince() != null) {
                    addressJson.addProperty("provinceId", primaryAddress.getProvince().getPid());
                    addressJson.addProperty("provinceName", primaryAddress.getProvince().getProvinces());
                }
                responseObject.add("primaryAddress", addressJson);
            }

            // Delivery types + provinces (same as normal checkout)
            List<DeliveryType> deliveryTypes = hibernateSession
                    .createQuery("FROM DeliveryType", DeliveryType.class).getResultList();
            responseObject.add("deliveryTypes", AppUtil.GSON.toJsonTree(deliveryTypes));

            List<Province> provinces = hibernateSession
                    .createQuery("FROM Province", Province.class).getResultList();
            responseObject.add("provinces", AppUtil.GSON.toJsonTree(provinces));

            responseObject.addProperty("buyNowStockId", stockId);
            responseObject.addProperty("buyNowQty", qty);

            status = true;
            message = "Buy Now data loaded!";

        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

}
