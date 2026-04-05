package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.List;

public class WishlistService {

    public String addToWishlist(int sId, HttpServletRequest request) {
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
            Stock stock = hibernateSession.find(Stock.class, sId);

            if (stock == null) {
                message = "Product not found!";
                transaction.rollback();
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", message);
                return AppUtil.GSON.toJson(responseObject);
            }

            // Check if already in wishlist
            Wishlist existing = hibernateSession
                    .createQuery("FROM Wishlist w WHERE w.user = :user AND w.stock = :stock",
                            Wishlist.class)
                    .setParameter("user", dbUser)
                    .setParameter("stock", stock)
                    .getSingleResultOrNull();

            if (existing != null) {
                // Already in wishlist — remove it (toggle off)
                hibernateSession.remove(existing);
                transaction.commit();
                status = true;
                message = "Removed from wishlist!";
                responseObject.addProperty("action", "removed");
            } else {
                // Not in wishlist — add it
                Wishlist wishlist = new Wishlist();
                wishlist.setUser(dbUser);
                wishlist.setStock(stock);
                hibernateSession.persist(wishlist);
                transaction.commit();
                status = true;
                message = "Added to wishlist!";
                responseObject.addProperty("action", "added");
            }

        } catch (HibernateException e) {
            transaction.rollback();
            e.printStackTrace();
            message = "Wishlist update failed. Please try again!";
        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    public String loadWishlist(HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            message = "Please login first!";
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", message);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

        try {
            List<Wishlist> wishlistItems = hibernateSession
                    .createQuery("FROM Wishlist w WHERE w.user.id = :userId", Wishlist.class)
                    .setParameter("userId", sessionUser.getId())
                    .getResultList();

            if (wishlistItems.isEmpty()) {
                message = "Your wishlist is empty!";
            } else {
                JsonArray itemsArray = new JsonArray();

                for (Wishlist item : wishlistItems) {
                    Stock stock   = item.getStock();
                    Product product = stock.getProduct();

                    JsonObject itemJson = new JsonObject();
                    itemJson.addProperty("wishlistId",    item.getId());
                    itemJson.addProperty("stockId",       stock.getId());
                    itemJson.addProperty("productId",     product.getId());
                    itemJson.addProperty("productTitle",  product.getTitle());
                    itemJson.addProperty("price",         stock.getPrice());
                    itemJson.addProperty("quantity",      stock.getQuantity());
                    itemJson.addProperty("colorValue",
                            product.getColor() != null ? product.getColor().getValue() : "");
                    itemJson.addProperty("colorHex",
                            product.getColor() != null ? product.getColor().getHexCode() : "#000");
                    itemJson.addProperty("sizeValue",
                            stock.getSize() != null ? stock.getSize().getValue() : "");
                    itemJson.addProperty("categoryName",
                            product.getCategory() != null ? product.getCategory().getName() : "");

                    String image = "assets/images/default.png";
                    if (product.getImages() != null && !product.getImages().isEmpty()) {
                        image = "assets/images/" + product.getImages().get(0);
                    }
                    itemJson.addProperty("image", image);

                    itemsArray.add(itemJson);
                }

                responseObject.add("wishlistItems", itemsArray);
                status  = true;
                message = "Wishlist loaded!";
            }

        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    public String removeFromWishlist(int wishlistId, HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            message = "Please login first!";
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", message);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction = hibernateSession.beginTransaction();

        try {
            Wishlist item = hibernateSession
                    .createQuery("FROM Wishlist w WHERE w.id = :id AND w.user.id = :userId",
                            Wishlist.class)
                    .setParameter("id", wishlistId)
                    .setParameter("userId", sessionUser.getId())
                    .getSingleResultOrNull();

            if (item == null) {
                message = "Wishlist item not found!";
                transaction.rollback();
            } else {
                hibernateSession.remove(item);
                transaction.commit();
                status  = true;
                message = "Removed from wishlist!";
            }

        } catch (HibernateException e) {
            transaction.rollback();
            e.printStackTrace();
            message = "Failed to remove item!";
        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    public String getWishlistCount(HttpServletRequest request) {
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
                    .createQuery("SELECT COUNT(w) FROM Wishlist w WHERE w.user.id = :userId",
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