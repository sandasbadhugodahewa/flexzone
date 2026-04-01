package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lk.jiat.flexzone.dto.*;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import lk.jiat.flexzone.validation.Validator;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.ArrayList;
import java.util.List;

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
                addressJson.addProperty("id",         primaryAddress.getId());
                addressJson.addProperty("firstName",  sessionUser.getFirstName());
                addressJson.addProperty("lastName",   sessionUser.getLastName());
                addressJson.addProperty("lineOne",    primaryAddress.getLineOne());
                addressJson.addProperty("lineTwo",    primaryAddress.getLineTwo() != null ? primaryAddress.getLineTwo() : "");
                addressJson.addProperty("city",       primaryAddress.getCity());
                addressJson.addProperty("postalCode", primaryAddress.getPostalCode());
                addressJson.addProperty("mobile",     primaryAddress.getMobile());
                if (primaryAddress.getProvince() != null) {
                    addressJson.addProperty("provinceId",   primaryAddress.getProvince().getPid());
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
            message = "Please login first!";
            responseObject.addProperty("status", status);
            responseObject.addProperty("message", message);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction = hibernateSession.beginTransaction();

        try {
            User dbUser = hibernateSession.find(User.class, sessionUser.getId());

            Address deliveryAddress;

            if (dto.isCurrentAddress()) {
                // Use existing primary address
                deliveryAddress = hibernateSession
                        .createQuery("FROM Address a WHERE a.user.id = :userId AND a.isPrimary = true", Address.class)
                        .setParameter("userId", dbUser.getId())
                        .getSingleResultOrNull();
                if (deliveryAddress == null) {
                    message = "Primary address not found. Please add an address!";
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", message);
                    return AppUtil.GSON.toJson(responseObject);
                }
            } else {
                if (dto.getFirstName() == null || dto.getFirstName().isBlank()) {
                    message = "First name is required!";
                } else if (dto.getLastName() == null || dto.getLastName().isBlank()) {
                    message = "Last name is required!";
                } else if (dto.getLineOne() == null || dto.getLineOne().isBlank()) {
                    message = "Address line one is required!";
                } else if (dto.getCity() == null || dto.getCity().isBlank()) {
                    message = "City is required!";
                } else if (dto.getPostalCode() == null || dto.getPostalCode().isBlank()) {
                    message = "Postal code is required!";
                } else if (!dto.getPostalCode().matches(Validator.POSTAL_CODE_VALIDATION)) {
                    message = "Enter a valid postal code!";
                } else if (dto.getMobile() == null || dto.getMobile().isBlank()) {
                    message = "Mobile number is required!";
                } else if (!dto.getMobile().matches(Validator.MOBILE_VALIDATION)) {
                    message = "Enter a valid mobile number!";
                } else {
                    message = null;
                }

                if (message != null) {
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", message);
                    return AppUtil.GSON.toJson(responseObject);
                }

                Province province = dto.getProvinceId() > 0
                        ? hibernateSession.find(Province.class, dto.getProvinceId())
                        : null;

                Status activeStatus = hibernateSession
                        .createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", Status.Type.ACTIVE.name())
                        .getSingleResult();

                Address existingPrimary = hibernateSession
                        .createQuery("FROM Address a WHERE a.user.id = :userId AND a.isPrimary = true", Address.class)
                        .setParameter("userId", dbUser.getId())
                        .getSingleResultOrNull();
                if (existingPrimary != null) {
                    existingPrimary.setIsPrimary(false);
                    hibernateSession.merge(existingPrimary);
                }

                //Save new address for primary
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

            //delivery type
            DeliveryType deliveryType = hibernateSession.find(DeliveryType.class, dto.getDeliveryTypeId());
            if (deliveryType == null) {
                deliveryType = hibernateSession
                        .createQuery("FROM DeliveryType", DeliveryType.class)
                        .setMaxResults(1)
                        .getSingleResult();
            }

            //cart items
            List<Cart> cartList = hibernateSession
                    .createQuery("FROM Cart c WHERE c.user.id = :userId", Cart.class)
                    .setParameter("userId", dbUser.getId())
                    .getResultList();

            if (cartList.isEmpty()) {
                message = "Your cart is empty!";
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", message);
                return AppUtil.GSON.toJson(responseObject);
            }

            //pending status
            Status pendingStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.PENDING.name())
                    .getSingleResult();

            // ── Create Order ──
            Order order = new Order();
            order.setUser(dbUser);
            order.setDeliveryType(deliveryType);
            order.setStatus(pendingStatus);
            hibernateSession.persist(order);

            double totalAmount = 0;
            for (Cart cart : cartList) {
                Stock stock = hibernateSession.find(Stock.class, cart.getStock().getId());

                // Validate stock quantity
                if (stock.getQuantity() < cart.getQty()) {
                    transaction.rollback();
                    message = "Sorry, '" + stock.getProduct().getTitle() +
                            "' only has " + stock.getQuantity() + " items left in stock!";
                    responseObject.addProperty("status", false);
                    responseObject.addProperty("message", message);
                    return AppUtil.GSON.toJson(responseObject);
                }

                OrderItem orderItem = new OrderItem();
                orderItem.setOrder(order);
                orderItem.setStock(stock);
                orderItem.setQty(cart.getQty());
                orderItem.setRating(0);
                hibernateSession.persist(orderItem);

                // ── DEDUCT quantity from stock ──
                stock.setQuantity(stock.getQuantity() - cart.getQty());
                hibernateSession.merge(stock);

                totalAmount += stock.getPrice() * cart.getQty();
            }

            // Add delivery charge
            totalAmount += deliveryType.getPrice();

            // ── Clear cart after order created ──
            for (Cart cart : cartList) {
                hibernateSession.remove(cart);
            }

            transaction.commit();

            responseObject.addProperty("orderId", order.getId());
            responseObject.addProperty("totalAmount", totalAmount);
            status = true;
            message = "Order placed successfully!";

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            message = "Order placement failed. Please try again!";
        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

}
