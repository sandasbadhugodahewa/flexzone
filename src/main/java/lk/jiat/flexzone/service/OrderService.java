package lk.jiat.flexzone.service;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.List;

public class OrderService {

    public void completeOrder(String payHereOrderId) {

        int orderId = Integer.parseInt(payHereOrderId.replaceAll("\\D+", ""));

        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction  = hibernateSession.beginTransaction();
        try {
            Order order = hibernateSession.find(Order.class, orderId);
            if (order == null) {
                System.out.println("completeOrder: order not found for id " + orderId);
                return;
            }

            Status completeStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.COMPLETED.name())
                    .getSingleResult();
            order.setStatus(completeStatus);
            hibernateSession.merge(order);

            // decrease stock
            List<OrderItem> orderItems = hibernateSession
                    .createQuery("FROM OrderItem oi WHERE oi.order.id=:oid", OrderItem.class)
                    .setParameter("oid", orderId)
                    .getResultList();

            for (OrderItem item : orderItems) {
                Stock stock = hibernateSession.find(Stock.class, item.getStock().getId());
                stock.setQuantity(stock.getQuantity() - item.getQty());
                hibernateSession.merge(stock);
            }

            //cart clear
            List<Cart> cartList = hibernateSession
                    .createQuery("FROM Cart c WHERE c.user.id=:uid", Cart.class)
                    .setParameter("uid", order.getUser().getId())
                    .getResultList();
            cartList.forEach(hibernateSession::remove);

            transaction.commit();
            System.out.println("completeOrder: " + payHereOrderId + " → COMPLETE. Cart cleared.");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
        } finally {
            hibernateSession.close();
        }
    }

    public void failedOrder(String payHereOrderId) {
        int orderId = Integer.parseInt(payHereOrderId.replaceAll("\\D+", ""));

        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction  = hibernateSession.beginTransaction();
        try {
            Order order = hibernateSession.find(Order.class, orderId);
            if (order == null) return;

            Status blockedStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.BLOCKED.name())
                    .getSingleResult();
            order.setStatus(blockedStatus);
            hibernateSession.merge(order);
            transaction.commit();
            System.out.println("failedOrder: " + payHereOrderId + " → BLOCKED.");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
        } finally {
            hibernateSession.close();
        }
    }

    public String getInvoiceData(String orderId, HttpServletRequest request) {
        com.google.gson.JsonObject responseObject = new com.google.gson.JsonObject();
        boolean status = false;
        String message;

        jakarta.servlet.http.HttpSession httpSession = request.getSession(false);

        if (httpSession == null || httpSession.getAttribute("user") == null) {
            message = "Please login first!";
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", message);
            return lk.jiat.flexzone.util.AppUtil.GSON.toJson(responseObject);
        }

        lk.jiat.flexzone.entity.User sessionUser =
                (lk.jiat.flexzone.entity.User) httpSession.getAttribute("user");

        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        try {

            Order order = hibernateSession
                    .createQuery("FROM Order o WHERE o.orderId = :oid", Order.class)
                    .setParameter("oid", orderId)
                    .getSingleResultOrNull();

            if (order == null) {
                message = "Order not found!";
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", message);
                return lk.jiat.flexzone.util.AppUtil.GSON.toJson(responseObject);
            }

            // Security: only the owner can view their invoice
            if (order.getUser().getId() != sessionUser.getId()) {
                message = "Unauthorized!";
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", message);
                return lk.jiat.flexzone.util.AppUtil.GSON.toJson(responseObject);
            }

            com.google.gson.JsonObject orderJson = new com.google.gson.JsonObject();
            orderJson.addProperty("orderId",      order.getOrderId());
            orderJson.addProperty("createdAt",    order.getCreatedAt().format(
                    java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
            orderJson.addProperty("status",       order.getStatus().getValue());
            orderJson.addProperty("deliveryType", order.getDeliveryType().getName());
            orderJson.addProperty("deliveryPrice",order.getDeliveryType().getPrice());
            orderJson.addProperty("total",        order.getTotal());

            // User info
            lk.jiat.flexzone.entity.User u = order.getUser();
            orderJson.addProperty("firstName",    u.getFirstName());
            orderJson.addProperty("lastName",     u.getLastName());
            orderJson.addProperty("email",        u.getEmail());

            // Primary delivery address
            lk.jiat.flexzone.entity.Address addr = hibernateSession
                    .createQuery("FROM Address a WHERE a.user.id=:uid AND a.isPrimary=true",
                            lk.jiat.flexzone.entity.Address.class)
                    .setParameter("uid", u.getId())
                    .getSingleResultOrNull();

            if (addr != null) {
                orderJson.addProperty("lineOne",    addr.getLineOne());
                orderJson.addProperty("lineTwo",    addr.getLineTwo() != null ? addr.getLineTwo() : "");
                orderJson.addProperty("city",       addr.getCity());
                orderJson.addProperty("postalCode", addr.getPostalCode());
                orderJson.addProperty("mobile",     addr.getMobile());
                if (addr.getProvince() != null)
                    orderJson.addProperty("province", addr.getProvince().getProvinces());
            }

            // Order items
            List<OrderItem> orderItems = hibernateSession
                    .createQuery("FROM OrderItem oi WHERE oi.order.id=:oid", OrderItem.class)
                    .setParameter("oid", order.getId())
                    .getResultList();

            com.google.gson.JsonArray itemsArray = new com.google.gson.JsonArray();
            for (OrderItem oi : orderItems) {
                lk.jiat.flexzone.entity.Stock stock = oi.getStock();
                lk.jiat.flexzone.entity.Product product = stock.getProduct();

                com.google.gson.JsonObject itemJson = new com.google.gson.JsonObject();
                itemJson.addProperty("stockId",      stock.getId());
                itemJson.addProperty("productTitle", product.getTitle());
                itemJson.addProperty("qty",          oi.getQty());
                itemJson.addProperty("price",        stock.getPrice());
                itemJson.addProperty("sizeValue",
                        stock.getSize() != null ? stock.getSize().getValue() : "");

                // First image
                com.google.gson.JsonArray imgArr = new com.google.gson.JsonArray();
                if (product.getImages() != null) {
                    product.getImages().forEach(imgArr::add);
                }
                itemJson.add("images", imgArr);

                itemsArray.add(itemJson);
            }
            orderJson.add("items", itemsArray);

            responseObject.add("order", orderJson);
            status  = true;
            message = "Invoice loaded!";

        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return lk.jiat.flexzone.util.AppUtil.GSON.toJson(responseObject);
    }

}
