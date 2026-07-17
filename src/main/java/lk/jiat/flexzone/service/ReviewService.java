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
}
