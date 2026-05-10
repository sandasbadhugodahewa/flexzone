package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lk.jiat.flexzone.dto.OrderDTO;
import lk.jiat.flexzone.dto.OrderItemDTO;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
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

            Status paidStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.PAID.name())
                    .getSingleResult();
            order.setStatus(paidStatus);

            DeliveryStatus approvedStatus =hibernateSession
                    .createNamedQuery("DeliveryStatus.findByValue", DeliveryStatus.class)
                    .setParameter("value", DeliveryStatus.Type.APPROVED.name())
                    .getSingleResult();
            order.setDeliveryStatus(approvedStatus);
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
            order.setDeliveryStatus(null);
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

        JsonObject responseObject = new JsonObject();

        HttpSession httpSession = request.getSession(false);

        if (httpSession == null || httpSession.getAttribute("user") == null) {
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Please login first!");
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");

        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

        try {

            Order order = hibernateSession
                    .createQuery("FROM Order o WHERE o.orderId = :oid", Order.class)
                    .setParameter("oid", orderId)
                    .getSingleResultOrNull();

            if (order == null) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Order not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            if (order.getUser().getId() != sessionUser.getId()) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Unauthorized!");
                return AppUtil.GSON.toJson(responseObject);
            }

//            String orderStatus = order.getStatus().getValue();
//
//            if (orderStatus.equalsIgnoreCase("PENDING") || orderStatus.equalsIgnoreCase("CANCELED")) {
//                responseObject.addProperty("status", false);
//                responseObject.addProperty("message", "Invoice not available for this order yet!");
//                return AppUtil.GSON.toJson(responseObject);
//            }

            // In getInvoiceData() — replace the status check:
            String paymentStatus  = order.getStatus() != null
                    ? order.getStatus().getValue() : "";
            String deliveryStatus = order.getDeliveryStatus() != null
                    ? order.getDeliveryStatus().getStatus() : "";

// Invoice only available if payment is PAID
            if (!paymentStatus.equalsIgnoreCase("PAID")) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Invoice not available. Payment not completed.");
                return AppUtil.GSON.toJson(responseObject);
            }

            OrderDTO dto = new OrderDTO();

            dto.setOrderId(order.getOrderId());
            dto.setCreatedAt(order.getCreatedAt().format(
                    DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
            dto.setStatus(order.getStatus().getValue());
            dto.setDeliveryType(order.getDeliveryType().getName());
            dto.setDeliveryPrice(order.getDeliveryType().getPrice());
            dto.setTotal(order.getTotal());
            dto.setStatus(paymentStatus);             // PAID / PENDING / BLOCKED
            dto.setDeliveryStatus(deliveryStatus);    // APPROVED / PACKING / SHIPPED etc.

            User u = order.getUser();
            dto.setFirstName(u.getFirstName());
            dto.setLastName(u.getLastName());
            dto.setEmail(u.getEmail());

            Address addr = order.getAddress();

            if (addr != null) {
                dto.setLineOne(addr.getLineOne());
                dto.setLineTwo(addr.getLineTwo());
                dto.setCity(addr.getCity());
                dto.setPostalCode(addr.getPostalCode());
                dto.setMobile(addr.getMobile());

                if (addr.getProvince() != null) {
                    dto.setProvince(addr.getProvince().getProvinces());
                }
            }

            List<OrderItem> orderItems = hibernateSession
                    .createQuery("FROM OrderItem oi WHERE oi.order.id=:oid", OrderItem.class)
                    .setParameter("oid", order.getId())
                    .getResultList();

            List<OrderItemDTO> itemDTOList = new ArrayList<>();

            for (OrderItem oi : orderItems) {

                OrderItemDTO itemDTO = new OrderItemDTO();

                Stock stock = oi.getStock();
                Product product = stock.getProduct();

                itemDTO.setStockId(stock.getId());
                itemDTO.setProductTitle(product.getTitle());
                itemDTO.setQty(oi.getQty());
                itemDTO.setPrice(stock.getPrice());

                if (stock.getSize() != null) {
                    itemDTO.setSizeValue(stock.getSize().getValue());
                }

                itemDTO.setImages(product.getImages());

                itemDTOList.add(itemDTO);
            }

            dto.setItems(itemDTOList);

            responseObject.add("order", AppUtil.GSON.toJsonTree(dto));
            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Invoice loaded!");

        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String getUserOrders(HttpServletRequest request) {

        JsonObject responseObject = new JsonObject();

        HttpSession httpSession = request.getSession(false);

        if (httpSession == null || httpSession.getAttribute("user") == null) {
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Please login first!");
            return AppUtil.GSON.toJson(responseObject);
        }

        User user = (User) httpSession.getAttribute("user");

        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

        try {

            List<Order> orders = hibernateSession.createQuery(
                            "FROM Order o WHERE o.user.id=:uid ORDER BY o.id DESC", Order.class)
                    .setParameter("uid", user.getId())
                    .getResultList();

            if (orders.isEmpty()) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "No orders found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            List<OrderDTO> dtoList = new ArrayList<>();

            for (Order order : orders) {

                OrderDTO dto = new OrderDTO();

                dto.setOrderId(order.getOrderId());
                dto.setCreatedAt(order.getCreatedAt().format(
                        DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a")));
//                dto.setStatus(order.getStatus().getValue());
                dto.setStatus(
                        order.getStatus() != null ? order.getStatus().getValue() : "");
                dto.setDeliveryStatus(
                        order.getDeliveryStatus() != null ? order.getDeliveryStatus().getStatus() : "");
                dto.setDeliveryType(order.getDeliveryType().getName());
                dto.setDeliveryPrice(order.getDeliveryType().getPrice());
                dto.setTotal(order.getTotal());

                User u = order.getUser();
                dto.setFirstName(u.getFirstName());
                dto.setLastName(u.getLastName());
                dto.setEmail(u.getEmail());

                Address addr = order.getAddress();
                if (addr != null) {
                    dto.setLineOne(addr.getLineOne());
                    dto.setLineTwo(addr.getLineTwo());
                    dto.setCity(addr.getCity());
                    dto.setPostalCode(addr.getPostalCode());
                    dto.setMobile(addr.getMobile());

                    if (addr.getProvince() != null) {
                        dto.setProvince(addr.getProvince().getProvinces());
                    }
                }

                // ── ITEMS ──
                List<OrderItem> orderItems = hibernateSession
                        .createQuery("FROM OrderItem oi WHERE oi.order.id=:oid", OrderItem.class)
                        .setParameter("oid", order.getId())
                        .getResultList();

                List<OrderItemDTO> itemDTOList = new ArrayList<>();

                for (OrderItem oi : orderItems) {

                    OrderItemDTO itemDTO = new OrderItemDTO();

                    Stock stock = oi.getStock();
                    Product product = stock.getProduct();

                    itemDTO.setStockId(stock.getId());
                    itemDTO.setProductTitle(product.getTitle());
                    itemDTO.setQty(oi.getQty());
                    itemDTO.setPrice(stock.getPrice());

                    if (stock.getSize() != null) {
                        itemDTO.setSizeValue(stock.getSize().getValue());
                    }

                    itemDTO.setImages(product.getImages());

                    itemDTOList.add(itemDTO);
                }

                dto.setItems(itemDTOList);

                dtoList.add(dto);
            }

            responseObject.add("orders", AppUtil.GSON.toJsonTree(dtoList));
            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Orders loaded!");

        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public static String getOrderCount(HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            responseObject.addProperty("count", 0);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

        try {
            Long count = hibernateSession
                    .createQuery("SELECT COUNT(o) FROM Order o WHERE o.user.id = :userId",
                            Long.class)
                    .setParameter("userId", sessionUser.getId())
                    .getSingleResult();

            responseObject.addProperty("count", count);
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

}
