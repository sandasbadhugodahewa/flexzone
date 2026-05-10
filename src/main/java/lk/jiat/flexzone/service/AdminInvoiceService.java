package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class AdminInvoiceService {

    private static final int PAGE_SIZE = 8;
    private static final DateTimeFormatter FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");

    public String getInvoiceList(String search, String statusFilter, int page) {

        JsonObject res = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            StringBuilder hql      = new StringBuilder("FROM Order o WHERE 1=1 ");
            StringBuilder countHql = new StringBuilder("SELECT COUNT(o) FROM Order o WHERE 1=1 ");

// In getInvoiceList() — smarter filter check
            String dbStatus         = mapStatus(statusFilter);
            boolean isPaymentStatus = dbStatus != null &&
                    (dbStatus.equals("PAID") || dbStatus.equals("PENDING") || dbStatus.equals("BLOCKED"));

            if (dbStatus != null) {
                if (isPaymentStatus) {
                    // Filter by payment status
                    hql.append("AND o.status.value = :status ");
                    countHql.append("AND o.status.value = :status ");
                } else {
                    // Filter by delivery status
                    hql.append("AND o.deliveryStatus.status = :status ");
                    countHql.append("AND o.deliveryStatus.status = :status ");
                }
            }

            // Search by orderId, user name, or email
            if (search != null && !search.isBlank()) {
                String cond = "AND (LOWER(o.orderId) LIKE :search " +
                        "OR LOWER(o.user.firstName) LIKE :search " +
                        "OR LOWER(o.user.lastName)  LIKE :search " +
                        "OR LOWER(o.user.email)     LIKE :search) ";
                hql.append(cond);
                countHql.append(cond);
            }

            hql.append("ORDER BY o.id DESC");

            // ── Count ──
            var cq = session.createQuery(countHql.toString(), Long.class);
            if (dbStatus != null) cq.setParameter("status", dbStatus);
            if (search != null && !search.isBlank())
                cq.setParameter("search", "%" + search.toLowerCase() + "%");
            long totalCount = cq.getSingleResult();

            // ── Stat counts ──
            long totalAll       = countAll(session);
            long totalPaid      = countByPaymentStatus(session,  "PAID");
            long totalPending   = countByPaymentStatus(session,  "PENDING");
            long totalApproved  = countByDeliveryStatus(session, "APPROVED");
            long totalDelivered = countByDeliveryStatus(session, "DELIVERED");
            long totalCompleted = countByDeliveryStatus(session, "COMPLETED");

            LocalDateTime startOfMonth = LocalDate.now()
                    .withDayOfMonth(1)
                    .atStartOfDay();

            LocalDateTime startOfNextMonth = startOfMonth.plusMonths(1);

            Double monthlyRevenue = session.createQuery("""
                            SELECT COALESCE(SUM(o.total), 0)
                            FROM Order o
                            WHERE o.status.value IN ('PAID')
                            AND o.createdAt >= :startMonth
                            AND o.createdAt < :nextMonth
                            """, Double.class)
                    .setParameter("startMonth", startOfMonth)
                    .setParameter("nextMonth", startOfNextMonth)
                    .getSingleResult();

            // ── Paginated orders ──
            var oq = session.createQuery(hql.toString(), Order.class);
            if (dbStatus != null) oq.setParameter("status", dbStatus);
            if (search != null && !search.isBlank())
                oq.setParameter("search", "%" + search.toLowerCase() + "%");
            oq.setFirstResult(page * PAGE_SIZE);
            oq.setMaxResults(PAGE_SIZE);

            List<Order> orders = oq.getResultList();
            JsonArray ordersArr = new JsonArray();

            for (Order o : orders) {
                JsonObject obj = new JsonObject();
                obj.addProperty("orderId",    o.getOrderId());
                obj.addProperty("total",      o.getTotal());
                obj.addProperty("status",     o.getStatus() != null ? o.getStatus().getValue() : "");
                obj.addProperty("deliveryType",
                        o.getDeliveryType() != null ? o.getDeliveryType().getName() : "—");
                obj.addProperty("createdAt",
                        o.getCreatedAt() != null ? o.getCreatedAt().format(FMT) : "—");
                obj.addProperty("updatedAt",
                        o.getUpdatedAt() != null ? o.getUpdatedAt().format(FMT) : "—");
                obj.addProperty("status",
                        o.getStatus() != null ? o.getStatus().getValue() : "");
                obj.addProperty("deliveryStatus",
                        o.getDeliveryStatus() != null ? o.getDeliveryStatus().getStatus() : "");

                // User info
                if (o.getUser() != null) {
                    obj.addProperty("customerName",
                            o.getUser().getFirstName() + " " + o.getUser().getLastName());
                    obj.addProperty("customerEmail", o.getUser().getEmail());
                }

                // Items count
                List<OrderItem> items = session
                        .createQuery("FROM OrderItem oi WHERE oi.order.id = :oid", OrderItem.class)
                        .setParameter("oid", o.getId())
                        .getResultList();
                obj.addProperty("itemCount", items.size());

                ordersArr.add(obj);
            }

            res.add("orders",           ordersArr);
            res.addProperty("totalCount",    totalCount);
            res.addProperty("currentPage",   page);
            res.addProperty("pageSize",      PAGE_SIZE);
            res.addProperty("totalAll",      totalAll);
            res.addProperty("totalCompleted",totalCompleted);
            res.addProperty("totalPending",  totalPending);
            res.addProperty("totalDelivered",totalDelivered);
            res.addProperty("totalRevenue",  monthlyRevenue != null ? monthlyRevenue : 0.0);
            res.addProperty("status",  true);
            res.addProperty("message", "Invoices loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status",  false);
            res.addProperty("message", "Failed to load invoices!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(res);
    }

    // ─────────────────────────────────────────────
    //  UPDATE ORDER STATUS (admin can change status)
    // ─────────────────────────────────────────────
    public String updateOrderStatus(String orderId, String newStatus) {
        JsonObject res = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        var tx = session.beginTransaction();

        try {
            Order order = session
                    .createQuery("FROM Order o WHERE o.orderId = :oid", Order.class)
                    .setParameter("oid", orderId)
                    .getSingleResultOrNull();

            if (order == null) {
                res.addProperty("status",  false);
                res.addProperty("message", "Order not found!");
                return AppUtil.GSON.toJson(res);
            }

//            var status = session
//                    .createNamedQuery("Status.findByValue", lk.jiat.flexzone.entity.Status.class)
//                    .setParameter("value", newStatus)
//                    .getSingleResult();

            if (newStatus.equals("PAID") || newStatus.equals("PENDING") || newStatus.equals("BLOCKED")) {
                Status status = session
                        .createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", newStatus).getSingleResult();
                order.setStatus(status);
            } else {
                // Delivery statuses → delivery_status table
                DeliveryStatus ds = session
                        .createNamedQuery("DeliveryStatus.findByValue", DeliveryStatus.class)
                        .setParameter("value", newStatus).getSingleResult();
                order.setDeliveryStatus(ds);
            }

            session.merge(order);
            tx.commit();

            res.addProperty("status",  true);
            res.addProperty("message", "Order status updated to " + newStatus + "!");

        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            res.addProperty("status",  false);
            res.addProperty("message", "Status update failed!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(res);
    }

    // ─────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────
// Fix the HQL filter — use deliveryStatus for delivery-related filtering
    private String mapStatus(String filter) {
        if (filter == null || filter.isBlank() || filter.equalsIgnoreCase("all")) return null;
        return switch (filter.toLowerCase()) {
            case "paid"      -> "PAID";          // payment status
            case "pending"   -> "PENDING";       // payment status
            case "approved"  -> "APPROVED";      // delivery status
            case "packing"   -> "PACKING";       // delivery status
            case "shipped"   -> "SHIPPED";       // delivery status
            case "delivered" -> "DELIVERED";     // delivery status
            case "completed" -> "COMPLETED";     // delivery status
            case "canceled"  -> "CANCELED";      // delivery status
            default -> null;
        };
    }

    private long countAll(Session session) {
        return session.createQuery("SELECT COUNT(o) FROM Order o", Long.class)
                .getSingleResult();
    }

    private long countByPaymentStatus(Session session, String value) {
        return session.createQuery(
                        "SELECT COUNT(o) FROM Order o WHERE o.status.value = :val", Long.class)
                .setParameter("val", value).getSingleResult();
    }

    private long countByDeliveryStatus(Session session, String value) {
        return session.createQuery(
                        "SELECT COUNT(o) FROM Order o WHERE o.deliveryStatus.status = :val", Long.class)
                .setParameter("val", value).getSingleResult();
    }

    public String getInvoiceDetail(String orderId) {
        JsonObject res = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        try {
            Order order = session
                    .createQuery("FROM Order o WHERE o.orderId = :oid", Order.class)
                    .setParameter("oid", orderId)
                    .getSingleResultOrNull();

            if (order == null) {
                res.addProperty("status", false);
                res.addProperty("message", "Order not found!");
                return AppUtil.GSON.toJson(res);
            }

            JsonObject obj = new JsonObject();
            obj.addProperty("orderId",        order.getOrderId());
            obj.addProperty("createdAt",      order.getCreatedAt() != null ? order.getCreatedAt().format(FMT) : "—");
            obj.addProperty("updatedAt",      order.getUpdatedAt() != null ? order.getUpdatedAt().format(FMT) : "—");
            obj.addProperty("status",         order.getStatus() != null ? order.getStatus().getValue() : "");
            obj.addProperty("deliveryStatus", order.getDeliveryStatus() != null ? order.getDeliveryStatus().getStatus() : "");
            obj.addProperty("total",          order.getTotal());
            obj.addProperty("deliveryType",   order.getDeliveryType() != null ? order.getDeliveryType().getName() : "—");
            obj.addProperty("deliveryPrice",  order.getDeliveryType() != null ? order.getDeliveryType().getPrice() : 0);

            // Customer
            User u = order.getUser();
            obj.addProperty("firstName",  u.getFirstName());
            obj.addProperty("lastName",   u.getLastName());
            obj.addProperty("email",      u.getEmail());

            // Address
            Address addr = order.getAddress();
            if (addr != null) {
                obj.addProperty("lineOne",    addr.getLineOne());
                obj.addProperty("lineTwo",    addr.getLineTwo() != null ? addr.getLineTwo() : "");
                obj.addProperty("city",       addr.getCity() != null ? addr.getCity() : "");
                obj.addProperty("postalCode", addr.getPostalCode());
                obj.addProperty("mobile",     addr.getMobile());
                obj.addProperty("province",   addr.getProvince() != null ? addr.getProvince().getProvinces() : "");
            }

            // Items
            List<OrderItem> items = session
                    .createQuery("FROM OrderItem oi WHERE oi.order.id = :oid", OrderItem.class)
                    .setParameter("oid", order.getId())
                    .getResultList();

            JsonArray itemsArr = new JsonArray();
            for (OrderItem oi : items) {
                Stock stock = oi.getStock();
                JsonObject item = new JsonObject();
                item.addProperty("stockId",      stock.getId());
                item.addProperty("productTitle", stock.getProduct().getTitle());
                item.addProperty("qty",          oi.getQty());
                item.addProperty("price",        stock.getPrice());
                item.addProperty("sizeValue",    stock.getSize() != null ? stock.getSize().getValue() : "");

                JsonArray imgs = new JsonArray();
                if (stock.getProduct().getImages() != null)
                    stock.getProduct().getImages().forEach(imgs::add);
                item.add("images", imgs);

                itemsArr.add(item);
            }
            obj.add("items", itemsArr);

            res.add("order", obj);
            res.addProperty("status", true);
            res.addProperty("message", "Invoice loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed to load invoice!");
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(res);
    }

}
