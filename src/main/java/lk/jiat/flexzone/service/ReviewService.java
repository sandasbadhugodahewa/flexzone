package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import lk.jiat.flexzone.dto.ReviewDTO;
import lk.jiat.flexzone.dto.ReviewSummaryDTO;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.DateUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.ArrayList;
import java.util.List;

public class ReviewService {
    public String addReview(ReviewDTO dto, HttpServletRequest request) {

        JsonObject obj = new JsonObject();

        if (dto.getRating() == 0) {
            obj.addProperty("status", false);
            obj.addProperty("message", "Star Rating is required!");
            return AppUtil.GSON.toJson(obj);
        } else if (dto.getOrderItemId() == 0) {
            obj.addProperty("status", false);
            obj.addProperty("message", "Select the product to review!");
            return AppUtil.GSON.toJson(obj);
        }

        User user = (User) request.getSession().getAttribute("user");

        Transaction tx = null;
        try (Session session = HibernateUtil.getSessionFactory().openSession()) {

            tx = session.beginTransaction();
            OrderItem orderItem = session.find(OrderItem.class, dto.getOrderItemId());
            if (orderItem == null) {
                obj.addProperty("status", false);
                obj.addProperty("message", "Order item not found!");
                return AppUtil.GSON.toJson(obj);
            }

            if (orderItem.getOrder().getUser().getId() != user.getId()) {
                obj.addProperty("status", false);
                obj.addProperty("message", "You do not have permission to add this review!");
                return AppUtil.GSON.toJson(obj);
            }

            Review existing = session.createQuery("FROM Review r WHERE r.orderItem.id = :id", Review.class)
                    .setParameter("id", dto.getOrderItemId()).uniqueResult();

            if (existing != null) {
                obj.addProperty("status", false);
                obj.addProperty("message", "You have already reviewed this product.");
                return AppUtil.GSON.toJson(obj);
            }

            Product product = orderItem.getStock().getProduct();
            Status pending = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", "PENDING").getSingleResult();

            Review review = new Review();
            review.setRating(dto.getRating());
            review.setReview(dto.getReview());
            review.setReviewTitle(dto.getReviewTitle());
            review.setUser(user);
            review.setProduct(product);
            review.setOrderItem(orderItem);
            review.setStatus(pending);

            session.persist(review);
            tx.commit();

            obj.addProperty("status", true);
            obj.addProperty("message", "Review added successfully.");
        } catch (Exception e) {
            if (tx != null) {
                tx.rollback();
            }
            e.printStackTrace();
            obj.addProperty("status", false);
            obj.addProperty("message", "Failed to add review. Please try again.");
        }
        return AppUtil.GSON.toJson(obj);
    }

    public String loadReviews(int productId) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session = HibernateUtil.getSessionFactory().openSession();
        ReviewSummaryDTO summary = new ReviewSummaryDTO();
        try {
            Status activeStatus = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", "ACTIVE").getSingleResult();

            List<Review> reviews = session.createQuery("FROM Review r WHERE r.product.id = :pid AND r.status = :status ORDER BY r.createdAt DESC",
                    Review.class).setParameter("pid", productId).setParameter("status", activeStatus).getResultList();

            int total = reviews.size();
            int fiveStar = 0;
            int fourStar = 0;
            int threeStar = 0;
            int twoStar = 0;
            int oneStar = 0;
            double totalRating = 0;

            if (reviews.isEmpty()) {
                message = "No reviews yet.";
            } else {
                List<ReviewDTO> dtoList = new ArrayList<>();
                for (Review review : reviews) {

                    totalRating += review.getRating();
                    switch (review.getRating()) {
                        case 5:
                            fiveStar++;
                            break;
                        case 4:
                            fourStar++;
                            break;
                        case 3:
                            threeStar++;
                            break;
                        case 2:
                            twoStar++;
                            break;
                        case 1:
                            oneStar++;
                            break;
                    }
                    ReviewDTO dto = new ReviewDTO();

                    dto.setId(review.getId());
                    dto.setRating(review.getRating());
                    dto.setReviewTitle(review.getReviewTitle());
                    dto.setReview(review.getReview());
                    dto.setStatus(review.getStatus().getValue());
                    dto.setCreatedAt(DateUtil.format(review.getCreatedAt()));
                    dto.setCustomerName(review.getUser().getFirstName() + " " + review.getUser().getLastName());

                    dtoList.add(dto);
                }
                double average = 0;
                if (total > 0) {
                    average = totalRating / total;
                }
                summary.setAverageRating(average);
                summary.setTotalReviews(total);
                summary.setFiveStar(fiveStar);
                summary.setFourStar(fourStar);
                summary.setThreeStar(threeStar);
                summary.setTwoStar(twoStar);
                summary.setOneStar(oneStar);

                responseObject.add("reviews", AppUtil.GSON.toJsonTree(dtoList));
                responseObject.add("summaries", AppUtil.GSON.toJsonTree(summary));
                status = true;
                message = "Reviews loaded.";
            }
        } finally {
            session.close();
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    //Admin load All reviews
    public String loadAllReviews(String statusFilter, String search, int rating) {
        JsonObject res = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            StringBuilder hql = new StringBuilder("FROM Review r WHERE 1=1 ");

            if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equals("all")) {
                hql.append("AND LOWER(r.status.value) = :status ");
            }
            if (search != null && !search.isBlank()) {
                hql.append("AND (LOWER(r.user.firstName) LIKE :search " +
                        "OR LOWER(r.user.lastName)  LIKE :search " +
                        "OR LOWER(r.product.title)  LIKE :search " +
                        "OR LOWER(r.review)         LIKE :search) ");
            }
            if (rating > 0) {
                hql.append("AND r.rating = :rating ");
            }
            hql.append("ORDER BY r.createdAt DESC");

            var q = session.createQuery(hql.toString(), Review.class);
            if (statusFilter != null && !statusFilter.isBlank() && !statusFilter.equals("all"))
                q.setParameter("status", statusFilter.toLowerCase());
            if (search != null && !search.isBlank())
                q.setParameter("search", "%" + search.toLowerCase() + "%");
            if (rating > 0)
                q.setParameter("rating", rating);

            List<Review> reviews = q.getResultList();

            long totalAll      = countByStatus(session, null);
            long totalPending  = countByStatus(session, "PENDING");
            long totalApproved = countByStatus(session, "ACTIVE");
            long totalRejected = countByStatus(session, "INACTIVE");
            long totalFlagged  = countByStatus(session, "BLOCKED");

            double avgRating = reviews.isEmpty() ? 0 :
                    reviews.stream().mapToInt(Review::getRating).average().orElse(0);

            JsonObject kpi = new JsonObject();
            kpi.addProperty("totalAll",      totalAll);
            kpi.addProperty("totalPending",  totalPending);
            kpi.addProperty("totalApproved", totalApproved);
            kpi.addProperty("totalRejected", totalRejected);
            kpi.addProperty("totalFlagged",  totalFlagged);
            kpi.addProperty("avgRating",     Math.round(avgRating * 10.0) / 10.0);
            res.add("kpi", kpi);

            com.google.gson.JsonArray arr = new com.google.gson.JsonArray();
            for (Review r : reviews) {
                JsonObject row = new JsonObject();
                row.addProperty("id",           r.getId());
                row.addProperty("rating",       r.getRating());
                row.addProperty("reviewTitle",  r.getReviewTitle() != null ? r.getReviewTitle() : "");
                row.addProperty("review",       r.getReview() != null ? r.getReview() : "");
                row.addProperty("status",       r.getStatus() != null ? r.getStatus().getValue() : "");
                row.addProperty("createdAt",    r.getCreatedAt() != null
                        ? r.getCreatedAt().format(java.time.format.DateTimeFormatter.ofPattern("dd MMM yyyy")) : "—");

                row.addProperty("customerName",r.getUser().getFirstName() + " " + r.getUser().getLastName());
                row.addProperty("customerEmail", r.getUser().getEmail());

                row.addProperty("productId",   r.getProduct().getId());
                row.addProperty("productName", r.getProduct().getTitle());
                String img = (r.getProduct().getImages() != null && !r.getProduct().getImages().isEmpty())
                        ? r.getProduct().getImages().get(0) : "";
                row.addProperty("productImage", img);

                arr.add(row);
            }
            res.add("reviews", arr);
            res.addProperty("status",  true);
            res.addProperty("message", "Reviews loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            res.addProperty("status",  false);
            res.addProperty("message", "Failed to load reviews!");
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    //Admin update review
    public String updateReviewStatus(int reviewId, String newStatus) {
        JsonObject res = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        var tx = session.beginTransaction();
        try {
            Review review = session.find(Review.class, reviewId);
            if (review == null) {
                res.addProperty("status",  false);
                res.addProperty("message", "Review not found!");
                return AppUtil.GSON.toJson(res);
            }
            Status status = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", newStatus).getSingleResult();
            review.setStatus(status);
            session.merge(review);
            tx.commit();
            res.addProperty("status",  true);
            res.addProperty("message", "Status updated to " + newStatus + "!");
        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            res.addProperty("status",  false);
            res.addProperty("message", "Update failed: " + e.getMessage());
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    //Admin delete review
    public String deleteReview(int reviewId) {
        JsonObject res = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        var tx = session.beginTransaction();
        try {
            Review review = session.find(Review.class, reviewId);
            if (review == null) {
                res.addProperty("status",  false);
                res.addProperty("message", "Review not found!");
                return AppUtil.GSON.toJson(res);
            }
            session.remove(review);
            tx.commit();
            res.addProperty("status",  true);
            res.addProperty("message", "Review deleted!");
        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            res.addProperty("status",  false);
            res.addProperty("message", "Delete failed!");
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(res);
    }

    private long countByStatus(Session session, String statusValue) {
        if (statusValue == null)
            return session.createQuery("SELECT COUNT(r) FROM Review r", Long.class).getSingleResult();
        return session.createQuery("SELECT COUNT(r) FROM Review r WHERE r.status.value = :val", Long.class)
                .setParameter("val", statusValue).getSingleResult();
    }
}
