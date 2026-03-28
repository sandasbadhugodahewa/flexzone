package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.ws.rs.core.Context;
import lk.jiat.flexzone.dto.UserDTO;
import lk.jiat.flexzone.entity.Status;
import lk.jiat.flexzone.entity.User;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import lk.jiat.flexzone.validation.Validator;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class ProfileService {

    public String updateProfile(UserDTO userDTO, @Context HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message = "";

        if (userDTO.getFirstName() == null) {
            message = "First name is required!";
        } else if (userDTO.getFirstName().isBlank()) {
            message = "First name can not be empty!";
        } else if (userDTO.getLastName() == null) {
            message = "Last name is required!";
        } else if (userDTO.getLastName().isBlank()) {
            message = "Last name can not be empty!";
        } else {
            HttpSession httpSession = request.getSession(false);
            if (httpSession == null) {
                message = "Please login first";
            } else if (httpSession.getAttribute("user") == null) {
                message = "Please login first";
            } else {
                User sessionUser = (User) httpSession.getAttribute("user");
                Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

                User dbUser = hibernateSession.createNamedQuery("User.getByEmail", User.class)
                        .setParameter("email", sessionUser.getEmail()).getSingleResult();

                dbUser.setFirstName(userDTO.getFirstName());
                dbUser.setLastName(userDTO.getLastName());

                Transaction transaction = hibernateSession.beginTransaction();

                try {
                    hibernateSession.merge(dbUser);

                    transaction.commit();
                    httpSession.setAttribute("user", dbUser); /// update session user
                    status = true;
                    message = "Profile details update successfully";
                } catch (HibernateException e) {
                    transaction.rollback();
                    message = "Profile details update failed!";
                }

                hibernateSession.close();

            }
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String userPassword(UserDTO userDTO, @Context HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message = "";

        if (userDTO.getPassword() == null || userDTO.getPassword().isBlank()) {
            message = "Current password is required!";
        } else if (userDTO.getNewPassword() == null || userDTO.getNewPassword().isBlank()) {
            message = "New password is required!";
        } else if (userDTO.getConfirmPassword() == null || userDTO.getConfirmPassword().isBlank()) {
            message = "Confirm password is required!";
        } else if (!userDTO.getNewPassword().matches(Validator.PASSWORD_VALIDATION)) {
            message = "Please provide valid password. \n " +
                    "The password must be at least 8-10 characters long and include at least one uppercase letter, " +
                    "one lowercase letter, one digit, and one special character";
        } else if (!userDTO.getConfirmPassword().matches(Validator.PASSWORD_VALIDATION)) {
            message = "Confirm password not valid. \n " +
                    "The password must be at least 8-10 characters long and include at least one uppercase letter, " +
                    "one lowercase letter, one digit, and one special character";
        } else if (userDTO.getNewPassword() != null && userDTO.getConfirmPassword() != null && !userDTO.getConfirmPassword().equals(userDTO.getNewPassword())) {
            message = "New password and confirm password did not match";
        } else {
            HttpSession httpSession = request.getSession(false);
            if (httpSession == null) {
                message = "Please login first";
            } else if (httpSession.getAttribute("user") == null) {
                message = "Please login first";
            } else {
                User sessionUser = (User) httpSession.getAttribute("user");
                Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
                User dbUser = hibernateSession.createNamedQuery("User.getByEmail", User.class)
                        .setParameter("email", sessionUser.getEmail())
                        .getSingleResult();

                dbUser.setPassword(!userDTO.getConfirmPassword().isBlank() ? userDTO.getConfirmPassword() : userDTO.getPassword());

                Transaction transaction = hibernateSession.beginTransaction();
                try {
                    hibernateSession.merge(dbUser);
                    transaction.commit();
                    httpSession.setAttribute("user", dbUser); /// update session user
                    status = true;
                    message = "Password update successfully";
                } catch (HibernateException e) {
                    transaction.rollback();
                    message = "Password update failed!";
                }

                hibernateSession.close();

            }
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String userProfile(HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null) {
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "No session");
            return AppUtil.GSON.toJson(responseObject);
        }

        User user = (User) httpSession.getAttribute("user");
        if (user == null) {
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Not logged in");
            return AppUtil.GSON.toJson(responseObject);
        }

        JsonObject data = new JsonObject();
        data.addProperty("id", user.getId());
        data.addProperty("firstName", user.getFirstName());
        data.addProperty("lastName", user.getLastName());
        data.addProperty("email", user.getEmail());

        LocalDateTime createdAt = user.getCreatedAt();  // must exist in entity
        if (createdAt != null) {
            String memberSince = createdAt.format(DateTimeFormatter.ofPattern("MMM dd yyyy")); // "Jan 2026"
            data.addProperty("memberSince", memberSince);
        }

        responseObject.addProperty("status", true);
        responseObject.addProperty("message", "OK");
        responseObject.add("data", data);

        return AppUtil.GSON.toJson(responseObject);
    }

    public static String deactivateUser(HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        String message = "";
        boolean status = false;

        HttpSession httpSession = request.getSession(false);
        if (httpSession == null || httpSession.getAttribute("user") == null) {
            message = "Please login first";
        } else {
            User sessionUser = (User) httpSession.getAttribute("user");
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            Transaction transaction = hibernateSession.beginTransaction();

            try {
                User dbUser = hibernateSession.createNamedQuery("User.getByEmail", User.class)
                        .setParameter("email", sessionUser.getEmail())
                        .getSingleResult();

                Status inactiveStatus = hibernateSession
                        .createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", Status.Type.INACTIVE.name())
                        .getSingleResult();

                dbUser.setStatus(inactiveStatus);


                hibernateSession.merge(dbUser);
                transaction.commit();

                httpSession.invalidate();

                status = true;
                message = "Account deactivated successfully!";
            } catch (Exception e) {
                if (transaction != null) transaction.rollback();
                e.printStackTrace();
                message = "Failed to deactivate account!";
            } finally {
                hibernateSession.close();
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    public String loadUserAddresses(@Context HttpServletRequest request) {
        return null;
    }

}

