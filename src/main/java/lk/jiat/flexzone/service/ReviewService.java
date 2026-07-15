package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import lk.jiat.flexzone.dto.ReviewDTO;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;

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
}
