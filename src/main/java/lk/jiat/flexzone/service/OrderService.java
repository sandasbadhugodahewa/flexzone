package lk.jiat.flexzone.service;

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

}
