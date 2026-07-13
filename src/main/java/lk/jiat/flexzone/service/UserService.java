package lk.jiat.flexzone.service;

import com.google.gson.Gson;
import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.Response;
import lk.jiat.flexzone.dto.UserDTO;
import lk.jiat.flexzone.entity.Address;
import lk.jiat.flexzone.entity.Role;
import lk.jiat.flexzone.entity.Status;
import lk.jiat.flexzone.entity.User;
import lk.jiat.flexzone.mail.AdminOtpMail;
import lk.jiat.flexzone.mail.VerificationMail;
import lk.jiat.flexzone.provider.MailServiceProvider;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import lk.jiat.flexzone.validation.Validator;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.Transaction;
import lk.jiat.flexzone.service.CartService;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

public class UserService {

    public String userLogin(UserDTO userDTO, @Context HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message = "";

        if (userDTO.getEmail() == null) {
            message = "Email is required!";
        } else if (userDTO.getEmail().isBlank()) {
            message = "Email address can not be empty!";
        } else if (!userDTO.getEmail().matches(Validator.EMAIL_VALIDATION)) {
            message = "Please provide valid email address!";
        } else if (userDTO.getPassword() == null) {
            message = "Password is required!";
        } else if (userDTO.getPassword().isBlank()) {
            message = "Password can not be empty!";
        } else if (!userDTO.getPassword().matches(Validator.PASSWORD_VALIDATION)) {
            message = "Please provide valid password. \n " +
                    "The password must be at least 8 characters long and include at least one uppercase letter, " +
                    "one lowercase letter, one digit, and one special character";
        } else {
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            User singleUser = hibernateSession.createNamedQuery("User.getByEmail", User.class)
                    .setParameter("email", userDTO.getEmail())
                    .getSingleResultOrNull();
            if (singleUser == null) {
                message = "Account not found. Please register first!";
            } else {
                if (!singleUser.getPassword().equals(userDTO.getPassword())) {
                    message = "Something went wrong. Please check your login credentials!";
                } else if (singleUser.getRole() == null || !singleUser.getRole().getValue().equals("USER")) {
                    message = "Something went wrong. Please check your role!";
                } else {
                    Status verifiedStatus = hibernateSession.createNamedQuery("Status.findByValue", Status.class)
                            .setParameter("value", String.valueOf(Status.Type.VERIFIED))
                            .getSingleResult();
                    if (!singleUser.getStatus().equals(verifiedStatus)) {
                        message = "Your account is not verified. Please verify first!";
                    } else {
                        HttpSession httpSession = request.getSession();
                        System.out.println("LOGIN SESSION ID: " + httpSession.getId());
                        httpSession.setAttribute("user", singleUser);
                        new CartService().mergeSessionCartToDb(request);
                        status = true;
                        message = "Login successful";
                        responseObject.addProperty("role", singleUser.getRole().getValue());
                    }
                }
            }
            hibernateSession.close();
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String googleLogin(String email, String firstName, String lastName, HttpServletRequest request) {

        JsonObject responseObject = new JsonObject();
        Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction = null;

        try {
            User user = hibernateSession.createNamedQuery("User.getByEmail", User.class).setParameter("email", email)
                    .getSingleResultOrNull();

            if (user == null) {
                user = new User();
                user.setFirstName(firstName);
                user.setLastName(lastName);
                user.setEmail(email);
                user.setPassword(java.util.UUID.randomUUID().toString());
                user.setVerificationCode("");

                Status verifiedStatus = hibernateSession.createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", "VERIFIED").getSingleResult();

                user.setStatus(verifiedStatus);
                Role userRole = hibernateSession.createQuery("FROM Role r WHERE r.value=:value", Role.class)
                        .setParameter("value", "USER").getSingleResult();

                user.setRole(userRole);
                transaction = hibernateSession.beginTransaction();
                hibernateSession.persist(user);
                transaction.commit();
            }

            HttpSession httpSession = request.getSession();
            System.out.println("GOOGLE LOGIN SESSION : " + httpSession.getId());
            httpSession.setAttribute("user", user);
            new CartService().mergeSessionCartToDb(request);
            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Google Login Successful");
            responseObject.addProperty("role", user.getRole().getValue());
        } catch (Exception e) {
            e.printStackTrace();
            if (transaction != null) {
                transaction.rollback();
            }
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Google login failed");
        } finally {
            hibernateSession.close();
        }
        return AppUtil.GSON.toJson(responseObject);
    }

    public String verifyUserAccount(UserDTO userDTO) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message = "";

        ///  logic handling part
        if (userDTO.getEmail() == null) {
            message = "Email is required!";
        } else if (userDTO.getEmail().isBlank()) {
            message = "Email address can not be empty!";
        } else if (!userDTO.getEmail().matches(Validator.EMAIL_VALIDATION)) {
            message = "Please provide valid email address!";
        } else if (userDTO.getVerificationCode() == null) {
            message = "Verification is required!";
        } else if (userDTO.getVerificationCode().isBlank()) {
            message = "Verification code can not be empty!";
        } else if (!userDTO.getVerificationCode().matches(Validator.VERIFICATION_CODE_VALIDATION)) {
            message = "Please provide valid verification code!. Verification code must have 6 digits";
        } else {
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            User user = hibernateSession.createQuery("FROM User u WHERE u.email=:email AND u.verificationCode=:verificationCode", User.class)
                    .setParameter("email", userDTO.getEmail())
                    .setParameter("verificationCode", userDTO.getVerificationCode())
                    .getSingleResultOrNull();
            if (user == null) {
                message = "Account not found. Please register first!";
            } else {
                Status verifiedStatus = hibernateSession.createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", String.valueOf(Status.Type.VERIFIED))
                        .getSingleResult();

                if (user.getStatus().equals(verifiedStatus)) {
                    message = "Account already verified!";
                } else {
                    user.setStatus(verifiedStatus);
                    user.setVerificationCode("");
                    Transaction transaction = hibernateSession.beginTransaction();
                    try {
                        hibernateSession.merge(user);
                        transaction.commit();
                        status = true;
                        message = "Account verification completed!";
                    } catch (HibernateException e) {
                        transaction.rollback();
                        message = "Something went wrong. Verification process failed!";
                    }
                }
            }
            hibernateSession.close();
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String addNewUser(UserDTO userDTO) {
        JsonObject responseObject = new JsonObject();

        boolean status = false;
        String message;

        if (userDTO.getFirstName() == null) {
            message = "First name is required!";
        } else if (userDTO.getFirstName().isBlank()) {
            message = "First name can not be empty!";
        } else if (userDTO.getLastName() == null) {
            message = "Last name is required!";
        } else if (userDTO.getLastName().isBlank()) {
            message = "Last name can not be empty!";
        } else if (userDTO.getEmail() == null) {
            message = "Email is required!";
        } else if (userDTO.getEmail().isBlank()) {
            message = "Email can not be empty!";
        } else if (!userDTO.getEmail().matches(Validator.EMAIL_VALIDATION)) {
            message = "Please provide valid email address!";
        } else if (userDTO.getPassword() == null) {
            message = "Password is required!";
        } else if (userDTO.getPassword().isBlank()) {
            message = "Password can not be empty!";
        } else if (!userDTO.getPassword().matches(Validator.PASSWORD_VALIDATION)) {
            message = "Please provide valid password. \n " +
                    "The password must be at least 8 characters long and include at least one uppercase letter, " +
                    "one lowercase letter, one digit, and one special character";
        } else {
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            User singleUser = hibernateSession.createNamedQuery("User.getByEmail", User.class)
                    .setParameter("email", userDTO.getEmail())
                    .getSingleResultOrNull();

            if (singleUser != null) { // Already exists
                message = "This email already exists! Please use another email";
            } else {
                User u = new User();
                u.setFirstName(userDTO.getFirstName());
                u.setLastName(userDTO.getLastName());
                u.setEmail(userDTO.getEmail());
                u.setPassword(userDTO.getPassword());

                String verificationCode = AppUtil.generateCode();

                u.setVerificationCode(verificationCode);

                Status pendingStatus = hibernateSession.createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", String.valueOf(Status.Type.PENDING)).getSingleResult();

                u.setStatus(pendingStatus);

                Role userRole = hibernateSession
                        .createQuery("FROM Role r WHERE r.value = :val", Role.class)
                        .setParameter("val", Role.Type.USER.name())
                        .getSingleResult();
                u.setRole(userRole);

                Transaction transaction = hibernateSession.beginTransaction();

                try {
                    hibernateSession.persist(u);
                    transaction.commit();

                    /// verification-mail-sending-start
                    VerificationMail verificationMail = new VerificationMail(u.getEmail(), verificationCode);
                    MailServiceProvider.getInstance().sendMail(verificationMail);
                    /// verification-mail-sending-end

                    status = true;
                    message = "Account created successfully. Verification code has been sent to the your email. " +
                            "Please verify it for activate your account!";
                } catch (HibernateException e) {
                    transaction.rollback();
                    message = "Account creation failed. Please try again!";
                }

            }
            hibernateSession.close();
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    // ── STEP 1: Admin login — validate credentials, send OTP ──
    public String adminLogin(UserDTO userDTO) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        if (userDTO.getEmail() == null || userDTO.getEmail().isBlank()) {
            message = "Email is required!";
        } else if (!userDTO.getEmail().matches(Validator.EMAIL_VALIDATION)) {
            message = "Please provide a valid email address!";
        } else if (userDTO.getPassword() == null || userDTO.getPassword().isBlank()) {
            message = "Password is required!";
        } else {
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            Transaction transaction = hibernateSession.beginTransaction();
            try {
                User user = hibernateSession
                        .createNamedQuery("User.getByEmail", User.class)
                        .setParameter("email", userDTO.getEmail())
                        .getSingleResultOrNull();

                if (user == null) {
                    message = "Account not found!";
                } else if (!user.getPassword().equals(userDTO.getPassword())) {
                    message = "Invalid credentials!";
                } else if (user.getRole() == null ||
                        !user.getRole().getValue().equals("ADMIN")) {
                    message = "Access denied. Admin accounts only!";
                } else {
                    // Generate 6-digit OTP
                    String otp = AppUtil.generateCode(); // your existing method

                    // Save OTP + expiry (5 minutes)
                    user.setOtpCode(otp);
                    user.setOtpExpiresAt(
                            java.time.LocalDateTime.now().plusMinutes(5)
                    );
                    hibernateSession.merge(user);
                    transaction.commit();

                    // Send OTP email
                    AdminOtpMail mail = new AdminOtpMail(user.getEmail(), otp);
                    MailServiceProvider.getInstance().sendMail(mail);

                    status = true;
                    message = "OTP sent to your email. Please check your inbox.";
                }
            } catch (Exception e) {
                transaction.rollback();
                e.printStackTrace();
                message = "Something went wrong. Please try again!";
            } finally {
                hibernateSession.close();
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }


    // ── STEP 2: Verify OTP, create session, go to dashboard ──
    public String verifyAdminOtp(UserDTO userDTO,
                                 HttpServletRequest request) {
        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        if (userDTO.getEmail() == null || userDTO.getEmail().isBlank()) {
            message = "Email is required!";
        } else if (userDTO.getVerificationCode() == null ||
                userDTO.getVerificationCode().isBlank()) {
            message = "OTP is required!";
        } else {
            Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
            Transaction transaction = hibernateSession.beginTransaction();
            try {
                User user = hibernateSession
                        .createNamedQuery("User.getByEmail", User.class)
                        .setParameter("email", userDTO.getEmail())
                        .getSingleResultOrNull();

                if (user == null) {
                    message = "Account not found!";
                } else if (user.getOtpCode() == null ||
                        !user.getOtpCode().equals(userDTO.getVerificationCode())) {
                    message = "Invalid OTP. Please try again!";
                } else if (user.getOtpExpiresAt() == null ||
                        java.time.LocalDateTime.now().isAfter(user.getOtpExpiresAt())) {
                    message = "OTP expired. Please login again!";
                } else {
                    // Clear OTP after successful use
                    user.setOtpCode(null);
                    user.setOtpExpiresAt(null);
                    hibernateSession.merge(user);
                    transaction.commit();

                    HttpSession httpSession = request.getSession();
                    httpSession.setAttribute("user", user);
                    httpSession.setAttribute("admin", user); // admin-specific key

                    status = true;
                    message = "Verified! Redirecting to dashboard...";
                }
            } catch (Exception e) {
                transaction.rollback();
                e.printStackTrace();
                message = "Verification failed. Please try again!";
            } finally {
                hibernateSession.close();
            }
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

}

