package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import static lk.jiat.flexzone.entity.Status.Type.PAID;

public class AdminReportService {

    private static final DateTimeFormatter DATE_FMT =
            DateTimeFormatter.ofPattern("dd MMM yyyy");
    private static final DateTimeFormatter MONTH_FMT =
            DateTimeFormatter.ofPattern("MMM yyyy");

    public String getSalesReport(String period, String from, String to) {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {
            // Only count PAID orders
            final String PAID = "PAID";

            Double totalRevenue = s.createQuery(
                    "SELECT COALESCE(SUM(o.total), 0) FROM Order o WHERE o.status.value = :p",
                    Double.class).setParameter("p", PAID).getSingleResult();

            Long totalOrders = s.createQuery(
                    "SELECT COUNT(o) FROM Order o WHERE o.status.value = :p",
                    Long.class).setParameter("p", PAID).getSingleResult();

            Double avgOrderValue = (totalOrders > 0) ? totalRevenue / totalOrders : 0;

            //Today
            LocalDateTime todayStart = LocalDate.now().atStartOfDay();
            LocalDateTime todayEnd = todayStart.plusDays(1);
            Double todaySales = s.createQuery(
                            "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                            Double.class)
                    .setParameter("p", PAID).setParameter("s", todayStart)
                    .setParameter("e", todayEnd).getSingleResult();
            Long todayOrders = s.createQuery(
                            "SELECT COUNT(o) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                            Long.class)
                    .setParameter("p", PAID).setParameter("s", todayStart)
                    .setParameter("e", todayEnd).getSingleResult();

            // ── This week ──
            LocalDateTime weekStart = LocalDate.now().with(
                    java.time.DayOfWeek.MONDAY).atStartOfDay();
            Double weekSales = s.createQuery(
                            "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s",
                            Double.class)
                    .setParameter("p", PAID).setParameter("s", weekStart).getSingleResult();
            Long weekOrders = s.createQuery(
                            "SELECT COUNT(o) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s",
                            Long.class)
                    .setParameter("p", PAID).setParameter("s", weekStart).getSingleResult();

            // ── This month ──
            LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
            LocalDateTime monthEnd = monthStart.plusMonths(1);
            Double monthSales = s.createQuery(
                            "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                            Double.class)
                    .setParameter("p", PAID).setParameter("s", monthStart)
                    .setParameter("e", monthEnd).getSingleResult();
            Long monthOrders = s.createQuery(
                            "SELECT COUNT(o) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                            Long.class)
                    .setParameter("p", PAID).setParameter("s", monthStart)
                    .setParameter("e", monthEnd).getSingleResult();

            // ── This year ──
            LocalDateTime yearStart = LocalDate.now().withDayOfYear(1).atStartOfDay();
            Double yearSales = s.createQuery(
                            "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s",
                            Double.class)
                    .setParameter("p", PAID).setParameter("s", yearStart).getSingleResult();
            Long yearOrders = s.createQuery(
                            "SELECT COUNT(o) FROM Order o " +
                                    "WHERE o.status.value=:p AND o.createdAt>=:s",
                            Long.class)
                    .setParameter("p", PAID).setParameter("s", yearStart).getSingleResult();

            // ── Last 12 months chart data ──
            JsonArray monthlyChart = new JsonArray();
            for (int i = 11; i >= 0; i--) {
                LocalDateTime mStart = LocalDate.now().withDayOfMonth(1)
                        .minusMonths(i).atStartOfDay();
                LocalDateTime mEnd = mStart.plusMonths(1);

                Double mRev = s.createQuery(
                                "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                        "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                                Double.class)
                        .setParameter("p", PAID).setParameter("s", mStart)
                        .setParameter("e", mEnd).getSingleResult();
                Long mOrd = s.createQuery(
                                "SELECT COUNT(o) FROM Order o " +
                                        "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                                Long.class)
                        .setParameter("p", PAID).setParameter("s", mStart)
                        .setParameter("e", mEnd).getSingleResult();

                JsonObject point = new JsonObject();
                point.addProperty("month", mStart.format(MONTH_FMT));
                point.addProperty("revenue", mRev);
                point.addProperty("orders", mOrd);
                monthlyChart.add(point);
            }

            // ── Last 7 days chart data ──
            JsonArray dailyChart = new JsonArray();
            for (int i = 6; i >= 0; i--) {
                LocalDateTime dStart = LocalDate.now().minusDays(i).atStartOfDay();
                LocalDateTime dEnd = dStart.plusDays(1);
                Double dRev = s.createQuery(
                                "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                        "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                                Double.class)
                        .setParameter("p", PAID).setParameter("s", dStart)
                        .setParameter("e", dEnd).getSingleResult();
                Long dOrd = s.createQuery(
                                "SELECT COUNT(o) FROM Order o " +
                                        "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                                Long.class)
                        .setParameter("p", PAID).setParameter("s", dStart)
                        .setParameter("e", dEnd).getSingleResult();

                JsonObject point = new JsonObject();
                point.addProperty("day", dStart.format(DATE_FMT));
                point.addProperty("revenue", dRev);
                point.addProperty("orders", dOrd);
                dailyChart.add(point);
            }

            // weeks chart data
            JsonArray weeklyChart = new JsonArray();
            for (int i = 7; i >= 0; i--) {
                LocalDateTime wStart = LocalDate.now()
                        .with(java.time.DayOfWeek.MONDAY)
                        .minusWeeks(i).atStartOfDay();
                LocalDateTime wEnd = wStart.plusWeeks(1);

                Double wRev = s.createQuery(
                                "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                                        "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                                Double.class)
                        .setParameter("p", PAID).setParameter("s", wStart)
                        .setParameter("e", wEnd).getSingleResult();
                Long wOrd = s.createQuery(
                                "SELECT COUNT(o) FROM Order o " +
                                        "WHERE o.status.value=:p AND o.createdAt>=:s AND o.createdAt<:e",
                                Long.class)
                        .setParameter("p", PAID).setParameter("s", wStart)
                        .setParameter("e", wEnd).getSingleResult();

                JsonObject point = new JsonObject();
                point.addProperty("week", "W" + wStart.format(
                        DateTimeFormatter.ofPattern("dd MMM")));
                point.addProperty("revenue", wRev);
                point.addProperty("orders", wOrd);
                weeklyChart.add(point);
            }

            // ── Recent 10 paid orders ──
            List<Object[]> recentOrders = s.createQuery(
                            "SELECT o.orderId, o.total, o.createdAt, o.user.firstName, o.user.lastName " +
                                    "FROM Order o WHERE o.status.value=:p ORDER BY o.createdAt DESC",
                            Object[].class)
                    .setParameter("p", PAID).getResultList();

            JsonArray recentArr = new JsonArray();
            for (Object[] row : recentOrders) {
                JsonObject obj = new JsonObject();
                obj.addProperty("orderId", (String) row[0]);
                obj.addProperty("total", (Double) row[1]);
                obj.addProperty("date", ((LocalDateTime) row[2]).format(DATE_FMT));
                obj.addProperty("customer", row[3] + " " + row[4]);
                recentArr.add(obj);
            }

            // Build response
            JsonObject kpi = new JsonObject();
            kpi.addProperty("totalRevenue", totalRevenue);
            kpi.addProperty("totalOrders", totalOrders);
            kpi.addProperty("avgOrderValue", avgOrderValue);
            kpi.addProperty("todaySales", todaySales);
            kpi.addProperty("todayOrders", todayOrders);
            kpi.addProperty("weekSales", weekSales);
            kpi.addProperty("weekOrders", weekOrders);
            kpi.addProperty("monthSales", monthSales);
            kpi.addProperty("monthOrders", monthOrders);
            kpi.addProperty("yearSales", yearSales);
            kpi.addProperty("yearOrders", yearOrders);

            res.add("kpi", kpi);
            res.add("monthlyChart", monthlyChart);
            res.add("dailyChart", dailyChart);
            res.add("weeklyChart", weeklyChart);
            res.add("recentOrders", recentArr);
            res.addProperty("status", true);
            res.addProperty("message", "Sales report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed to load sales report: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    // ══════════════════════════════════════════════════════════
    //  2. ORDER REPORT
    // ══════════════════════════════════════════════════════════
    public String getOrderReport(String status, String dateFrom, String dateTo) {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {
            // Payment status counts
            long totalAll = count(s, "SELECT COUNT(o) FROM Order o");
            long totalPaid = countWhere(s, "o.status.value", "PAID");
            long totalPending = countWhere(s, "o.status.value", "PENDING");
            long totalBlocked = countWhere(s, "o.status.value", "BLOCKED");

            // Delivery status counts
            long totalApproved = countDelivery(s, "APPROVED");
            long totalPacking = countDelivery(s, "PACKING");
            long totalShipped = countDelivery(s, "SHIPPED");
            long totalDelivered = countDelivery(s, "DELIVERED");
            long totalCompleted = countDelivery(s, "COMPLETED");
            long totalCanceled = countDelivery(s, "CANCELED");

            // Status distribution for pie chart
            JsonArray statusDist = new JsonArray();
            addSlice(statusDist, "Paid", totalPaid, "#16a34a");
            addSlice(statusDist, "Pending", totalPending, "#d97706");
            addSlice(statusDist, "Failed", totalBlocked, "#dc2626");

            // Delivery distribution
            JsonArray deliveryDist = new JsonArray();
            addSlice(deliveryDist, "Approved", totalApproved, "#2563eb");
            addSlice(deliveryDist, "Packing", totalPacking, "#7c3aed");
            addSlice(deliveryDist, "Shipped", totalShipped, "#0891b2");
            addSlice(deliveryDist, "Delivered", totalDelivered, "#0d9488");
            addSlice(deliveryDist, "Completed", totalCompleted, "#15803d");
            addSlice(deliveryDist, "Canceled", totalCanceled, "#6b7280");

            // Orders per day last 30 days
            JsonArray dailyOrders = new JsonArray();
            for (int i = 29; i >= 0; i--) {
                LocalDateTime dStart = LocalDate.now().minusDays(i).atStartOfDay();
                LocalDateTime dEnd = dStart.plusDays(1);
                Long cnt = s.createQuery(
                                "SELECT COUNT(o) FROM Order o WHERE o.createdAt>=:s AND o.createdAt<:e",
                                Long.class)
                        .setParameter("s", dStart).setParameter("e", dEnd).getSingleResult();
                JsonObject pt = new JsonObject();
                pt.addProperty("day", dStart.format(DATE_FMT));
                pt.addProperty("count", cnt);
                dailyOrders.add(pt);
            }

            List<Object[]> allOrders = s.createQuery(
                            "SELECT o.orderId, o.total,o.createdAt,o.status.value,o.deliveryStatus.status," +
                                    "o.user.firstName,o.user.lastName  " +
                                    "FROM Order o ORDER BY o.createdAt DESC", Object[].class)
                    .getResultList();

            JsonArray allOrdersArr = new JsonArray();
            for (Object[] row : allOrders) {
                JsonObject obj = new JsonObject();
                obj.addProperty("orderId", (String) row[0]);
                obj.addProperty("total", ((Number) row[1]).doubleValue());
                obj.addProperty("date", ((LocalDateTime) row[2]).format(DATE_FMT));
                obj.addProperty("payment", row[3] != null ? (String) row[3] : "—");
                obj.addProperty("delivery", row[4] != null ? (String) row[4] : "PENDING");
                obj.addProperty("customer", row[5] + " " + row[6]);
                allOrdersArr.add(obj);
            }

            JsonObject kpi = new JsonObject();
            kpi.addProperty("totalAll", totalAll);
            kpi.addProperty("totalPaid", totalPaid);
            kpi.addProperty("totalPending", totalPending);
            kpi.addProperty("totalBlocked", totalBlocked);
            kpi.addProperty("totalApproved", totalApproved);
            kpi.addProperty("totalPacking", totalPacking);
            kpi.addProperty("totalShipped", totalShipped);
            kpi.addProperty("totalDelivered", totalDelivered);
            kpi.addProperty("totalCompleted", totalCompleted);
            kpi.addProperty("totalCanceled", totalCanceled);

            res.add("kpi", kpi);
            res.add("statusDist", statusDist);
            res.add("deliveryDist", deliveryDist);
            res.add("dailyOrders", dailyOrders);
            res.add("allOrders", allOrdersArr);
            res.addProperty("status", true);
            res.addProperty("message", "Order report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    // ══════════════════════════════════════════════════════════
    //  3. PRODUCT SALES REPORT
    // ══════════════════════════════════════════════════════════
    public String getProductReport() {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {

            List<Object[]> bestSelling = s.createQuery(
                    "SELECT oi.stock.product.id, oi.stock.product.title, " +
                            "SUM(oi.qty), SUM(oi.qty * oi.stock.price) " +
                            "FROM OrderItem oi " +
                            "WHERE oi.order.status.value = 'PAID' " +
                            "GROUP BY oi.stock.product.id, oi.stock.product.title " +
                            "ORDER BY SUM(oi.qty) DESC",
                    Object[].class).setMaxResults(10).getResultList();

            JsonArray bestSellingArr = new JsonArray();
            for (Object[] row : bestSelling) {
                int productId = (int) row[0];      // product.id is int
                String title = (String) row[1];
                long totalQty = ((Number) row[2]).longValue();   // ← fix: Number not Long
                double totalRev = ((Number) row[3]).doubleValue(); // ← fix: Number not Double

                // Fetch first image from product_images table separately
                // (images is @ElementCollection — cannot GROUP BY it in HQL)
                String firstImage = null;
                try {
                    firstImage = s.createQuery(
                                    "SELECT img FROM Product p JOIN p.images img " +
                                            "WHERE p.id = :id",
                                    String.class)
                            .setParameter("id", productId)
                            .setMaxResults(1)
                            .getSingleResult();
                } catch (Exception ignored) {
                }

                JsonObject obj = new JsonObject();
                obj.addProperty("id", productId);
                obj.addProperty("title", title);
                obj.addProperty("totalQty", totalQty);
                obj.addProperty("totalRev", totalRev);
                obj.addProperty("image", firstImage != null ? firstImage : "");
                bestSellingArr.add(obj);
            }


            List<Object[]> lowSelling = s.createQuery(
                    "SELECT p.id, p.title, COALESCE(SUM(oi.qty), 0) as sold " +
                            "FROM Product p " +
                            "LEFT JOIN p.stocks st " +
                            "LEFT JOIN OrderItem oi ON oi.stock.id = st.id " +
                            "WHERE p.status.value = 'ACTIVE' " +
                            "GROUP BY p.id, p.title " +
                            "HAVING COALESCE(SUM(oi.qty), 0) < 5 " +
                            "ORDER BY sold ASC",
                    Object[].class
            ).setMaxResults(10).getResultList();

            JsonArray lowArr = new JsonArray();
            for (Object[] row : lowSelling) {
                JsonObject obj = new JsonObject();
                obj.addProperty("productId", (Integer) row[0]);
                obj.addProperty("title", (String) row[1]);
                obj.addProperty("totalQty", ((Number) row[2]).intValue());
                lowArr.add(obj);
            }

            // Out of stock products
            List<Object[]> outOfStock = s.createQuery(
                    "SELECT p.id, p.title, COUNT(st) as variants " +
                            "FROM Product p JOIN p.stocks st " +
                            "WHERE p.status.value = 'ACTIVE' " +
                            "GROUP BY p.id, p.title " +
                            "HAVING SUM(st.quantity) = 0",
                    Object[].class).getResultList();

            JsonArray outArr = new JsonArray();
            for (Object[] row : outOfStock) {
                JsonObject obj = new JsonObject();
                obj.addProperty("productId", (Integer) row[0]);
                obj.addProperty("title", (String) row[1]);
                obj.addProperty("variants", ((Long) row[2]).intValue());
                outArr.add(obj);
            }

            // Category-wise sales
            List<Object[]> catSales = s.createQuery(
                    "SELECT oi.stock.product.category.name, SUM(oi.qty), " +
                            "SUM(oi.qty * oi.stock.price) " +
                            "FROM OrderItem oi " +
                            "WHERE oi.order.status.value = 'PAID' " +
                            "GROUP BY oi.stock.product.category.name " +
                            "ORDER BY SUM(oi.qty) DESC",
                    Object[].class).getResultList();

            JsonArray catArr = new JsonArray();
            for (Object[] row : catSales) {
                JsonObject obj = new JsonObject();
                obj.addProperty("category", (String) row[0]);
                obj.addProperty("qty", ((Long) row[1]).intValue());
                obj.addProperty("revenue", (Double) row[2]);
                catArr.add(obj);
            }

            //Products Table
            List<Object[]> products = s.createQuery(
                    "SELECT p.id,p.title,p.category.name,COUNT(st.id),COALESCE(SUM(st.quantity), 0),MIN(st.price), " +
                            "MAX(st.price),p.status.value FROM Product p LEFT JOIN p.stocks st " +
                            "GROUP BY p.id, p.title, p.category.name ORDER BY p.createdAt DESC",
                    Object[].class).getResultList();

            JsonArray productTable = new JsonArray();
            for (Object[] row : products) {
                JsonObject obj = new JsonObject();
                obj.addProperty("id", (Integer) row[0]);
                obj.addProperty("productName", (String) row[1]);
                obj.addProperty("category", (String) row[2]);
                obj.addProperty("variants", ((Long) row[3]).intValue());
                obj.addProperty("stock", ((Long) row[4]).intValue());
                double minPrice = row[5] != null ? ((Number) row[5]).doubleValue(): 0;
                double maxPrice = row[6] != null ? ((Number) row[6]).doubleValue(): 0;
                obj.addProperty("status", (String) row[7]);
                obj.addProperty("priceRange","Rs. " + minPrice + " - Rs. " + maxPrice);
                productTable.add(obj);
            }

            res.add("bestSelling", bestSellingArr);
            res.add("lowSelling", lowArr);
            res.add("outOfStock", outArr);
            res.add("catSales", catArr);
            res.add("productsTable", productTable);
            res.addProperty("status", true);
            res.addProperty("message", "Product report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    public String getInventoryReport() {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {
            // Total active products
            Long totalProducts = s.createQuery(
                    "SELECT COUNT(p) FROM Product p WHERE p.status.value='ACTIVE'",
                    Long.class).getSingleResult();

            Long totalStockVariants = s.createQuery(
                    "SELECT COUNT(st) FROM Stock st WHERE st.product.status.value='ACTIVE'",
                    Long.class).getSingleResult();

            Long totalUnits = s.createQuery(
                    "SELECT COALESCE(SUM(st.quantity), 0) FROM Stock st " +
                            "WHERE st.product.status.value='ACTIVE'",
                    Long.class).getSingleResult();

            // Low stock (quantity 1–10)
            List<Object[]> lowStock = s.createQuery(
                    "SELECT st.product.id, st.product.title, st.size.value, " +
                            "st.quantity, st.price " +
                            "FROM Stock st WHERE st.product.status.value='ACTIVE' " +
                            "AND st.quantity > 0 AND st.quantity <= 10 " +
                            "ORDER BY st.quantity ASC",
                    Object[].class).setMaxResults(20).getResultList();

            JsonArray lowArr = new JsonArray();
            for (Object[] row : lowStock) {
                JsonObject obj = new JsonObject();
                obj.addProperty("productId", (Integer) row[0]);
                obj.addProperty("title", (String) row[1]);
                obj.addProperty("size", row[2] != null ? (String) row[2] : "—");
                obj.addProperty("quantity", (Integer) row[3]);
                obj.addProperty("price", (Double) row[4]);
                lowArr.add(obj);
            }

            // Out of stock
            List<Object[]> outStock = s.createQuery(
                    "SELECT st.product.id, st.product.title, st.size.value " +
                            "FROM Stock st WHERE st.product.status.value='ACTIVE' " +
                            "AND st.quantity = 0",
                    Object[].class).getResultList();

            JsonArray outArr = new JsonArray();
            for (Object[] row : outStock) {
                JsonObject obj = new JsonObject();
                obj.addProperty("productId", (Integer) row[0]);
                obj.addProperty("title", (String) row[1]);
                obj.addProperty("size", row[2] != null ? (String) row[2] : "—");
                outArr.add(obj);
            }

            // Size-wise stock totals
            List<Object[]> sizeStock = s.createQuery(
                    "SELECT st.size.value, SUM(st.quantity) FROM Stock st " +
                            "WHERE st.product.status.value='ACTIVE' AND st.size IS NOT NULL " +
                            "GROUP BY st.size.value ORDER BY st.size.value",
                    Object[].class).getResultList();

            JsonArray sizeArr = new JsonArray();
            for (Object[] row : sizeStock) {
                JsonObject obj = new JsonObject();
                obj.addProperty("size", (String) row[0]);
                obj.addProperty("quantity", ((Long) row[1]).intValue());
                sizeArr.add(obj);
            }

            // Category-wise stock
            List<Object[]> catStock = s.createQuery(
                    "SELECT st.product.category.name, SUM(st.quantity) FROM Stock st " +
                            "WHERE st.product.status.value='ACTIVE' " +
                            "GROUP BY st.product.category.name",
                    Object[].class).getResultList();

            JsonArray catArr = new JsonArray();
            for (Object[] row : catStock) {
                JsonObject obj = new JsonObject();
                obj.addProperty("category", (String) row[0]);
                obj.addProperty("quantity", ((Long) row[1]).intValue());
                catArr.add(obj);
            }

            List<Object[]> colorStock = s.createQuery(
                    "SELECT st.product.color.value, SUM(st.quantity) " +
                            "FROM Stock st " +
                            "WHERE st.product.status.value='ACTIVE' " +
                            "AND st.product.color IS NOT NULL " +
                            "GROUP BY st.product.color.value " +
                            "ORDER BY st.product.color.value",
                    Object[].class
            ).getResultList();

            JsonArray colorArr = new JsonArray();

            for (Object[] row : colorStock) {
                JsonObject obj = new JsonObject();

                obj.addProperty("color", (String) row[0]);
                obj.addProperty("quantity", ((Long) row[1]).intValue());

                colorArr.add(obj);
            }

            List<Object[]> stockRows = s.createQuery(
                    "SELECT p.title, p.category.name, st.size.value, p.color.value, " +
                            "st.quantity, st.price " +
                            "FROM Stock st " +
                            "JOIN st.product p " +
                            "ORDER BY p.createdAt DESC",
                    Object[].class
            ).getResultList();

            JsonArray stockTable = new JsonArray();

            for (Object[] row : stockRows) {

                int qty = ((Number) row[4]).intValue();
                String status;
                if (qty == 0) {
                    status = "OUT";
                } else if (qty <= 10) {
                    status = "LOW";
                } else {
                    status = "OK";
                }
                JsonObject obj = new JsonObject();
                obj.addProperty("title", (String) row[0]);
                obj.addProperty("category", (String) row[1]);
                obj.addProperty("size", (String) row[2]);
                obj.addProperty("color", (String) row[3]);
                obj.addProperty("quantity", qty);
                obj.addProperty("price", ((Number) row[5]).doubleValue());
                obj.addProperty("stockStatus", status);
                stockTable.add(obj);
            }

            JsonObject kpi = new JsonObject();
            kpi.addProperty("totalProducts", totalProducts);
            kpi.addProperty("totalStockVariants", totalStockVariants);
            kpi.addProperty("totalUnits", totalUnits);
            kpi.addProperty("lowStockCount", lowStock.size());
            kpi.addProperty("outOfStockCount", outStock.size());

            res.add("kpi", kpi);
            res.add("lowStock", lowArr);
            res.add("outStock", outArr);
            res.add("colorStock", colorArr);
            res.add("sizeStock", catArr.size() > 0 ? sizeArr : new JsonArray());
            res.add("catStock", catArr);
            res.add("stockTable", stockTable);
            res.addProperty("status", true);
            res.addProperty("message", "Inventory report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    // ══════════════════════════════════════════════════════════
    //  5. CUSTOMER REPORT
    // ══════════════════════════════════════════════════════════
    public String getCustomerReport() {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {
            Long totalCustomers = s.createQuery(
                    "SELECT COUNT(u) FROM User u WHERE u.role.value='USER'",
                    Long.class).getSingleResult();

            Long activeCustomers = s.createQuery(
                    "SELECT COUNT(u) FROM User u WHERE u.role.value='USER' " +
                            "AND u.status.value='VERIFIED'",
                    Long.class).getSingleResult();

            // New this month
            LocalDateTime monthStart = LocalDate.now().withDayOfMonth(1).atStartOfDay();
            Long newThisMonth = s.createQuery(
                    "SELECT COUNT(u) FROM User u WHERE u.role.value='USER' " +
                            "AND u.createdAt >= :s",
                    Long.class).setParameter("s", monthStart).getSingleResult();

            // Top 10 spending customers
            List<Object[]> topSpenders = s.createQuery(
                    "SELECT o.user.id, o.user.firstName, o.user.lastName, " +
                            "o.user.email, COUNT(o), SUM(o.total) " +
                            "FROM Order o WHERE o.status.value='PAID' " +
                            "GROUP BY o.user.id, o.user.firstName, o.user.lastName, o.user.email " +
                            "ORDER BY SUM(o.total) DESC",
                    Object[].class).setMaxResults(10).getResultList();

            JsonArray topArr = new JsonArray();
            for (Object[] row : topSpenders) {
                JsonObject obj = new JsonObject();
                obj.addProperty("userId", (Integer) row[0]);
                obj.addProperty("name", row[1] + " " + row[2]);
                obj.addProperty("email", (String) row[3]);
                obj.addProperty("orders", ((Long) row[4]).intValue());
                obj.addProperty("totalSpent", (Double) row[5]);
                topArr.add(obj);
            }

            // New customers last 6 months
            JsonArray newChart = new JsonArray();
            for (int i = 5; i >= 0; i--) {
                LocalDateTime mStart = LocalDate.now().withDayOfMonth(1)
                        .minusMonths(i).atStartOfDay();
                LocalDateTime mEnd = mStart.plusMonths(1);
                Long cnt = s.createQuery(
                                "SELECT COUNT(u) FROM User u WHERE u.role.value='USER' " +
                                        "AND u.createdAt>=:s AND u.createdAt<:e",
                                Long.class)
                        .setParameter("s", mStart).setParameter("e", mEnd).getSingleResult();
                JsonObject pt = new JsonObject();
                pt.addProperty("month", mStart.format(MONTH_FMT));
                pt.addProperty("count", cnt);
                newChart.add(pt);
            }

            JsonObject kpi = new JsonObject();
            kpi.addProperty("totalCustomers", totalCustomers);
            kpi.addProperty("activeCustomers", activeCustomers);
            kpi.addProperty("newThisMonth", newThisMonth);

            res.add("kpi", kpi);
            res.add("topSpenders", topArr);
            res.add("newChart", newChart);
            res.addProperty("status", true);
            res.addProperty("message", "Customer report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    // ══════════════════════════════════════════════════════════
    //  6. PAYMENT REPORT
    // ══════════════════════════════════════════════════════════
    public String getPaymentReport() {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {
            Long paidCount = countWhere(s, "o.status.value", "PAID");
            Long pendingCount = countWhere(s, "o.status.value", "PENDING");
            Long failedCount = countWhere(s, "o.status.value", "BLOCKED");

            Double paidRevenue = s.createQuery(
                    "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                            "WHERE o.status.value='PAID'", Double.class).getSingleResult();
            Double pendingRevenue = s.createQuery(
                    "SELECT COALESCE(SUM(o.total), 0) FROM Order o " +
                            "WHERE o.status.value='PENDING'", Double.class).getSingleResult();

            // Monthly payment revenue last 6 months
            JsonArray monthlyPayment = new JsonArray();
            for (int i = 5; i >= 0; i--) {
                LocalDateTime mStart = LocalDate.now().withDayOfMonth(1)
                        .minusMonths(i).atStartOfDay();
                LocalDateTime mEnd = mStart.plusMonths(1);

                Double paid = s.createQuery(
                                "SELECT COALESCE(SUM(o.total),0) FROM Order o " +
                                        "WHERE o.status.value='PAID' AND o.createdAt>=:s AND o.createdAt<:e",
                                Double.class)
                        .setParameter("s", mStart).setParameter("e", mEnd).getSingleResult();
                Double pending = s.createQuery(
                                "SELECT COALESCE(SUM(o.total),0) FROM Order o " +
                                        "WHERE o.status.value='PENDING' AND o.createdAt>=:s AND o.createdAt<:e",
                                Double.class)
                        .setParameter("s", mStart).setParameter("e", mEnd).getSingleResult();
                Long failed = s.createQuery(
                                "SELECT COUNT(o) FROM Order o " +
                                        "WHERE o.status.value='BLOCKED' AND o.createdAt>=:s AND o.createdAt<:e",
                                Long.class)
                        .setParameter("s", mStart).setParameter("e", mEnd).getSingleResult();

                JsonObject pt = new JsonObject();
                pt.addProperty("month", mStart.format(MONTH_FMT));
                pt.addProperty("paid", paid);
                pt.addProperty("pending", pending);
                pt.addProperty("failed", failed);
                monthlyPayment.add(pt);
            }

            JsonObject kpi = new JsonObject();
            kpi.addProperty("paidCount", paidCount);
            kpi.addProperty("pendingCount", pendingCount);
            kpi.addProperty("failedCount", failedCount);
            kpi.addProperty("paidRevenue", paidRevenue);
            kpi.addProperty("pendingRevenue", pendingRevenue);

            res.add("kpi", kpi);
            res.add("monthlyPayment", monthlyPayment);
            res.addProperty("status", true);
            res.addProperty("message", "Payment report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    // ══════════════════════════════════════════════════════════
    //  7. DELIVERY REPORT
    // ══════════════════════════════════════════════════════════
    public String getDeliveryReport() {
        JsonObject res = new JsonObject();
        Session s = HibernateUtil.getSessionFactory().openSession();

        try {
            long approved = countDelivery(s, "APPROVED");
            long packing = countDelivery(s, "PACKING");
            long shipped = countDelivery(s, "SHIPPED");
            long delivered = countDelivery(s, "DELIVERED");
            long completed = countDelivery(s, "COMPLETED");
            long canceled = countDelivery(s, "CANCELED");
            long noStatus = s.createQuery(
                    "SELECT COUNT(o) FROM Order o WHERE o.status.value='PAID' " +
                            "AND o.deliveryStatus IS NULL", Long.class).getSingleResult();

            // Delivery type breakdown
            List<Object[]> typeBreak = s.createQuery(
                    "SELECT o.deliveryType.name, COUNT(o) FROM Order o " +
                            "WHERE o.status.value='PAID' GROUP BY o.deliveryType.name",
                    Object[].class).getResultList();

            JsonArray typeArr = new JsonArray();
            for (Object[] row : typeBreak) {
                JsonObject obj = new JsonObject();
                obj.addProperty("type", (String) row[0]);
                obj.addProperty("count", ((Long) row[1]).intValue());
                typeArr.add(obj);
            }

            // Delivery status distribution for chart
            JsonArray distArr = new JsonArray();
            addSlice(distArr, "Approved", approved, "#2563eb");
            addSlice(distArr, "Packing", packing, "#7c3aed");
            addSlice(distArr, "Shipped", shipped, "#0891b2");
            addSlice(distArr, "Delivered", delivered, "#0d9488");
            addSlice(distArr, "Completed", completed, "#15803d");
            addSlice(distArr, "Canceled", canceled, "#6b7280");
            addSlice(distArr, "Pending", noStatus, "#d97706");

            JsonObject kpi = new JsonObject();
            kpi.addProperty("approved", approved);
            kpi.addProperty("packing", packing);
            kpi.addProperty("shipped", shipped);
            kpi.addProperty("delivered", delivered);
            kpi.addProperty("completed", completed);
            kpi.addProperty("canceled", canceled);
            kpi.addProperty("noStatus", noStatus);
            kpi.addProperty("inProgress", approved + packing + shipped);

            res.add("kpi", kpi);
            res.add("distArr", distArr);
            res.add("typeArr", typeArr);
            res.addProperty("status", true);
            res.addProperty("message", "Delivery report loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status", false);
            res.addProperty("message", "Failed: " + e.getMessage());
        } finally {
            s.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    // ── Private helpers ──────────────────────────────────────
    private long count(Session s, String hql) {
        return s.createQuery(hql, Long.class).getSingleResult();
    }

    private long countWhere(Session s, String field, String value) {
        return s.createQuery(
                "SELECT COUNT(o) FROM Order o WHERE " + field + "=:v",
                Long.class).setParameter("v", value).getSingleResult();
    }

    private long countDelivery(Session s, String value) {
        return s.createQuery(
                "SELECT COUNT(o) FROM Order o WHERE o.deliveryStatus.status=:v",
                Long.class).setParameter("v", value).getSingleResult();
    }

    private void addSlice(JsonArray arr, String label, long value, String color) {
        JsonObject obj = new JsonObject();
        obj.addProperty("label", label);
        obj.addProperty("value", value);
        obj.addProperty("color", color);
        arr.add(obj);
    }
}
