package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lk.jiat.flexzone.dto.CartDTO;
import lk.jiat.flexzone.entity.Cart;
import lk.jiat.flexzone.entity.Stock;
import lk.jiat.flexzone.entity.User;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.ArrayList;
import java.util.List;

public class CartService {

    public String addToCart(int stockId, int qty, HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        if (qty <= 0) {
            message = "Invalid quantity!";
        } else {
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            Stock stock = hibernateSession.find(Stock.class, stockId);

            if (stock == null) {
                message = "Product not found!";
                hibernateSession.close();
            } else if (stock.getQuantity() <= 0) {
                message = "This product is out of stock!";
                hibernateSession.close();
            } else if (qty > stock.getQuantity()) {
                message = "Requested quantity exceeds available stock!";
                hibernateSession.close();
            } else {
                HttpSession httpSession = request.getSession(false);
                if (httpSession == null) httpSession = request.getSession();
                User sessionUser = (User) httpSession.getAttribute("user");

                if (sessionUser == null) {
                    // ── Guest user — store in session ──
                    hibernateSession.close();
                    String result = addToSessionCart(stock, qty, httpSession);
                    return result;
                } else {
                    // ── Logged-in user — store in DB ──
                    String result = addToDbCart(stock, qty, sessionUser, hibernateSession);
                    return result;
                }
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    // ── Guest: add to session cart ──
    private String addToSessionCart(Stock stock, int qty, HttpSession httpSession) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        List<Cart> sessionCart = getSessionCart(httpSession);
        if (sessionCart == null) sessionCart = new ArrayList<>();

        // Check if same stock already in session cart
        Cart existing = null;
        for (Cart c : sessionCart) {
            if (c.getStock().getId() == stock.getId()) {
                existing = c;
                break;
            }
        }

        if (existing != null) {
            int newQty = existing.getQty() + qty;
            if (newQty > stock.getQuantity()) {
                message = "Cannot add more. Quantity exceeds available stock!";
            } else {
                existing.setQty(newQty);
                httpSession.setAttribute("sessionCart", sessionCart);
                status = true;
                message = "Cart updated!";
            }
        } else {
            Cart newCart = new Cart();
            newCart.setId(sessionCart.size() + 1); // temp ID for session
            newCart.setStock(stock);
            newCart.setQty(qty);
            newCart.setUser(null);
            sessionCart.add(newCart);
            httpSession.setAttribute("sessionCart", sessionCart);
            status = true;
            message = "Product added to cart!";
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    // ── Logged-in user: add to DB cart ──
    private String addToDbCart(Stock stock, int qty, User sessionUser, Session hibernateSession) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        try {
            User dbUser = hibernateSession.find(User.class, sessionUser.getId());

            Cart existingCart = hibernateSession
                    .createQuery("FROM Cart c WHERE c.user = :user AND c.stock = :stock", Cart.class)
                    .setParameter("user", dbUser)
                    .setParameter("stock", stock)
                    .getSingleResultOrNull();

            Transaction transaction = hibernateSession.beginTransaction();
            try {
                if (existingCart == null) {
                    // New cart item
                    Cart newCart = new Cart();
                    newCart.setUser(dbUser);
                    newCart.setStock(stock);
                    newCart.setQty(qty);
                    hibernateSession.persist(newCart);
                    status = true;
                    message = "Product added to cart!";
                } else {
                    // Update existing
                    int newQty = existingCart.getQty() + qty;
                    if (newQty > stock.getQuantity()) {
                        message = "Cannot add more. Quantity exceeds available stock!";
                    } else {
                        existingCart.setQty(newQty);
                        hibernateSession.merge(existingCart);
                        status = true;
                        message = "Cart updated!";
                    }
                }
                transaction.commit();
            } catch (HibernateException e) {
                transaction.rollback();
                message = "Failed to add to cart. Please try again!";
            }
        } finally {
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String getAllCarts(HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null) {
            message = "Your cart is empty!";
            responseObject.addProperty("status", status);
            responseObject.addProperty("message", message);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");

        if (sessionUser == null) {
            // ── Guest: load from session ──
            List<Cart> sessionCart = getSessionCart(httpSession);
            if (sessionCart == null || sessionCart.isEmpty()) {
                message = "Your cart is empty!";
            } else {
                List<CartDTO> cartDTOs = buildCartDTOs(sessionCart);
                responseObject.add("cartItems", AppUtil.GSON.toJsonTree(cartDTOs));
                status = true;
                message = "Cart loaded successfully!";
            }
        } else {
            // ── Logged-in: load from DB ──
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            try {
                List<Cart> cartList = hibernateSession
                        .createQuery("FROM Cart c WHERE c.user.id = :userId", Cart.class)
                        .setParameter("userId", sessionUser.getId())
                        .getResultList();

                if (cartList.isEmpty()) {
                    message = "Your cart is empty!";
                } else {
                    List<CartDTO> cartDTOs = buildCartDTOs(cartList);
                    responseObject.add("cartItems", AppUtil.GSON.toJsonTree(cartDTOs));
                    status = true;
                    message = "Cart loaded successfully!";
                }
            } finally {
                hibernateSession.close();
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    public String removeCartItem(int cartId, HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null) {
            message = "Session not found!";
            responseObject.addProperty("status", status);
            responseObject.addProperty("message", message);
            return AppUtil.GSON.toJson(responseObject);
        }

        User sessionUser = (User) httpSession.getAttribute("user");

        if (sessionUser == null) {
            // ── Guest: remove from session ──
            List<Cart> sessionCart = getSessionCart(httpSession);
            if (sessionCart == null || sessionCart.isEmpty()) {
                message = "Cart is empty!";
            } else {
                boolean removed = sessionCart.removeIf(c -> c.getId() == cartId);
                if (removed) {
                    httpSession.setAttribute("sessionCart", sessionCart);
                    status = true;
                    message = "Item removed from cart!";
                } else {
                    message = "Cart item not found!";
                }
            }
        } else {
            // ── Logged-in: remove from DB ──
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            try {
                Cart cart = hibernateSession
                        .createQuery("FROM Cart c WHERE c.id = :cartId AND c.user.id = :userId", Cart.class)
                        .setParameter("cartId", cartId)
                        .setParameter("userId", sessionUser.getId())
                        .getSingleResultOrNull();

                if (cart == null) {
                    message = "Cart item not found!";
                } else {
                    Transaction transaction = hibernateSession.beginTransaction();
                    try {
                        hibernateSession.remove(cart);
                        transaction.commit();
                        status = true;
                        message = "Item removed from cart!";
                    } catch (HibernateException e) {
                        transaction.rollback();
                        message = "Failed to remove item. Please try again!";
                    }
                }
            } finally {
                hibernateSession.close();
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    public void mergeSessionCartToDb(HttpServletRequest request) {
        HttpSession httpSession = request.getSession(false);
        if (httpSession == null) return;

        User sessionUser = (User) httpSession.getAttribute("user");
        if (sessionUser == null) return;

        List<Cart> sessionCart = getSessionCart(httpSession);
        if (sessionCart == null || sessionCart.isEmpty()) return;

        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction = hibernateSession.beginTransaction();

        try {
            User dbUser = hibernateSession.find(User.class, sessionUser.getId());

            for (Cart sessionItem : sessionCart) {
                Stock stock = hibernateSession.find(Stock.class, sessionItem.getStock().getId());
                if (stock == null) continue;

                Cart existing = hibernateSession
                        .createQuery("FROM Cart c WHERE c.user = :user AND c.stock = :stock", Cart.class)
                        .setParameter("user", dbUser)
                        .setParameter("stock", stock)
                        .getSingleResultOrNull();

                if (existing == null) {
                    Cart newCart = new Cart();
                    newCart.setUser(dbUser);
                    newCart.setStock(stock);
                    newCart.setQty(sessionItem.getQty());
                    hibernateSession.persist(newCart);
                } else {
                    int newQty = existing.getQty() + sessionItem.getQty();
                    if (newQty <= stock.getQuantity()) {
                        existing.setQty(newQty);
                        hibernateSession.merge(existing);
                    }
                }
            }
            transaction.commit();
        } catch (Exception e) {
            transaction.rollback();
        } finally {
            hibernateSession.close();
        }

        // Clear session cart after merge
        httpSession.setAttribute("sessionCart", null);
    }


    // Build CartDTO list from Cart entity list
    private List<CartDTO> buildCartDTOs(List<Cart> cartList) {
        List<CartDTO> dtoList = new ArrayList<>();
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        try {
            for (Cart cart : cartList) {
                Stock stock = hibernateSession.find(Stock.class, cart.getStock().getId());
                if (stock == null) continue;

                CartDTO dto = new CartDTO();
                dto.setCartId(cart.getId());
                dto.setStockId(stock.getId());
                dto.setProductId(stock.getProduct().getId());
                dto.setProductTitle(stock.getProduct().getTitle());
                dto.setImages(stock.getProduct().getImages());
                dto.setPrice(stock.getPrice());
                dto.setQty(cart.getQty());

                // Size — only if stock has a size (after your DB migration)
                if (stock.getSize() != null) {
                    dto.setSizeValue(stock.getSize().getValue());
                }

                dtoList.add(dto);
            }
        } finally {
            hibernateSession.close();
        }
        return dtoList;
    }

    // Get session cart safely (suppress unchecked cast warning)
    @SuppressWarnings("unchecked")
    private List<Cart> getSessionCart(HttpSession httpSession) {
        return (List<Cart>) httpSession.getAttribute("sessionCart");
    }
}
