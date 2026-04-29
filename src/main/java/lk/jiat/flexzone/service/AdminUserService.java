package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import lk.jiat.flexzone.entity.Address;
import lk.jiat.flexzone.entity.Role;
import lk.jiat.flexzone.entity.Status;
import lk.jiat.flexzone.entity.User;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.time.format.DateTimeFormatter;
import java.util.List;

public class AdminUserService {

    private static final int PAGE_SIZE = 8;

    public String getUserList(String filter, String search, int page) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();

        try {
            StringBuilder hql      = new StringBuilder("FROM User u WHERE 1=1 ");
            StringBuilder countHql = new StringBuilder("SELECT COUNT(u) FROM User u WHERE 1=1 ");

            if (filter != null && !filter.equals("all")) {
                String condition = " AND u.status.value = :filter ";
                hql.append(condition);
                countHql.append(condition);
            }

            if (search != null && !search.isBlank()) {
                String condition = " AND (LOWER(u.firstName) LIKE :search " +
                        "OR LOWER(u.lastName)  LIKE :search " +
                        "OR LOWER(u.email)     LIKE :search) ";
                hql.append(condition);
                countHql.append(condition);
            }

            hql.append("ORDER BY u.id DESC");

            //Count query
            var countQuery = hibernateSession.createQuery(countHql.toString(), Long.class);
            if (filter != null && !filter.equals("all"))
                countQuery.setParameter("filter", filter.toUpperCase());
            if (search != null && !search.isBlank())
                countQuery.setParameter("search", "%" + search.toLowerCase() + "%");

            long totalCount = countQuery.getSingleResult();

            //Count status for tab badges
            long totalAll     = countByStatus(hibernateSession, null);
            long totalVerified = countByStatus(hibernateSession, "VERIFIED");
            long totalPending  = countByStatus(hibernateSession, "PENDING");
            long totalBlocked  = countByStatus(hibernateSession, "BLOCKED");

            //Paginated user query
            var userQuery = hibernateSession.createQuery(hql.toString(), User.class);
            if (filter != null && !filter.equals("all"))
                userQuery.setParameter("filter", filter.toUpperCase());
            if (search != null && !search.isBlank())
                userQuery.setParameter("search", "%" + search.toLowerCase() + "%");

            userQuery.setFirstResult(page * PAGE_SIZE);
            userQuery.setMaxResults(PAGE_SIZE);

            List<User> users = userQuery.getResultList();

            JsonArray userArray = new JsonArray();
            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy");

            for (User u : users) {
                JsonObject userJson = new JsonObject();
                userJson.addProperty("id",        u.getId());
                userJson.addProperty("firstName",  u.getFirstName());
                userJson.addProperty("lastName",   u.getLastName());
                userJson.addProperty("email",      u.getEmail());
                userJson.addProperty("role",
                        u.getRole() != null ? u.getRole().getValue() : "USER");
                userJson.addProperty("status",
                        u.getStatus() != null ? u.getStatus().getValue() : "");
                userJson.addProperty("joinedAt",
                        u.getCreatedAt() != null ? u.getCreatedAt().format(fmt) : "—");

                //Get primary address mobile
                String mobile = "—";
                if (u.getAddresses() != null) {
                    mobile = u.getAddresses().stream()
                            .filter(a -> a.isPrimary())
                            .map(a -> a.getMobile())
                            .findFirst()
                            .orElse("—");
                }
                userJson.addProperty("mobile", mobile);

                userArray.add(userJson);
            }

            responseObject.add("users",          userArray);
            responseObject.addProperty("totalCount",    totalCount);
            responseObject.addProperty("pageSize",      PAGE_SIZE);
            responseObject.addProperty("currentPage",   page);
            responseObject.addProperty("totalAll",      totalAll);
            responseObject.addProperty("totalVerified", totalVerified);
            responseObject.addProperty("totalPending",  totalPending);
            responseObject.addProperty("totalBlocked",  totalBlocked);
            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "Users loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to load users!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    private long countByStatus(Session session, String statusValue) {
        try {
            if (statusValue == null) {
                return session.createQuery("SELECT COUNT(u) FROM User u", Long.class)
                        .getSingleResult();
            }
            return session.createQuery(
                            "SELECT COUNT(u) FROM User u WHERE u.status.value = :val", Long.class)
                    .setParameter("val", statusValue)
                    .getSingleResult();
        } catch (Exception e) {
            return 0;
        }
    }

    //BLOCK USER
    public String blockUser(int userId) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction   = hibernateSession.beginTransaction();

        try {
            User user = hibernateSession.find(User.class, userId);
            if (user == null) {
                responseObject.addProperty("status",  false);
                responseObject.addProperty("message", "User not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            Status blockedStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.BLOCKED.name())
                    .getSingleResult();

            user.setStatus(blockedStatus);
            hibernateSession.merge(user);
            transaction.commit();

            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "User blocked successfully!");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to block user!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    // UNBLOCK / ACTIVATE USER
    public String unblockUser(int userId) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction   = hibernateSession.beginTransaction();

        try {
            User user = hibernateSession.find(User.class, userId);
            if (user == null) {
                responseObject.addProperty("status",  false);
                responseObject.addProperty("message", "User not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            Status verifiedStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.VERIFIED.name())
                    .getSingleResult();

            user.setStatus(verifiedStatus);
            hibernateSession.merge(user);
            transaction.commit();

            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "User activated successfully!");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to activate user!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    //MAKE ADMIN (promote role)
    public String makeAdmin(int userId) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction   = hibernateSession.beginTransaction();

        try {
            User user = hibernateSession.find(User.class, userId);
            if (user == null) {
                responseObject.addProperty("status",  false);
                responseObject.addProperty("message", "User not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            Role adminRole = hibernateSession
                    .createQuery("FROM Role r WHERE r.value = :val", Role.class)
                    .setParameter("val", Role.Type.ADMIN.name())
                    .getSingleResult();

            user.setRole(adminRole);
            hibernateSession.merge(user);
            transaction.commit();

            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "User promoted to Admin!");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to promote user!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    //DELETE USER
    public String deleteUser(int userId) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction   = hibernateSession.beginTransaction();

        try {
            User user = hibernateSession.find(User.class, userId);
            if (user == null) {
                responseObject.addProperty("status",  false);
                responseObject.addProperty("message", "User not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            Status blockedStatus = hibernateSession
                    .createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.INACTIVE.name())
                    .getSingleResult();
            user.setStatus(blockedStatus);
            hibernateSession.merge(user);
            transaction.commit();

            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "User removed successfully!");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to remove user!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String getSingleUser(int userId) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();

        try {
            User user = hibernateSession.find(User.class, userId);

            if (user == null) {
                responseObject.addProperty("status",  false);
                responseObject.addProperty("message", "User not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            DateTimeFormatter fmt = DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a");
            DateTimeFormatter dateFmt = DateTimeFormatter.ofPattern("dd MMM yyyy");

            JsonObject userJson = new JsonObject();
            userJson.addProperty("id",        user.getId());
            userJson.addProperty("firstName", user.getFirstName());
            userJson.addProperty("lastName",  user.getLastName());
            userJson.addProperty("email",     user.getEmail());
            userJson.addProperty("role",
                    user.getRole() != null ? user.getRole().getValue() : "USER");
            userJson.addProperty("status",
                    user.getStatus() != null ? user.getStatus().getValue() : "");
            userJson.addProperty("joinedAt",
                    user.getCreatedAt() != null ? user.getCreatedAt().format(dateFmt) : "—");
            userJson.addProperty("updatedAt",
                    user.getUpdatedAt() != null ? user.getUpdatedAt().format(dateFmt) : "—");

            //Addresses
            JsonArray addressArray = new JsonArray();
            if (user.getAddresses() != null) {
                for (Address addr : user.getAddresses()) {
                    if (addr.getStatus() == null ||
                            addr.getStatus().getValue().equals("ACTIVE") ||
                            addr.getStatus().getValue().equals("VERIFIED")) {

                        JsonObject addrJson = new JsonObject();
                        addrJson.addProperty("id",         addr.getId());
                        addrJson.addProperty("lineOne",    addr.getLineOne());
                        addrJson.addProperty("lineTwo",    addr.getLineTwo() != null ? addr.getLineTwo() : "");
                        addrJson.addProperty("city",       addr.getCity());
                        addrJson.addProperty("postalCode", addr.getPostalCode());
                        addrJson.addProperty("mobile",     addr.getMobile());
                        addrJson.addProperty("isPrimary",  addr.isPrimary());
                        if (addr.getProvince() != null) {
                            addrJson.addProperty("provinceId",   addr.getProvince().getPid());
                            addrJson.addProperty("provinceName", addr.getProvince().getProvinces());
                        }
                        addressArray.add(addrJson);
                    }
                }
            }
            userJson.add("addresses", addressArray);

            String mobile = user.getAddresses() == null ? "—" :
                    user.getAddresses().stream()
                            .filter(a -> a.isPrimary())
                            .map(a -> a.getMobile())
                            .findFirst().orElse("—");
            userJson.addProperty("mobile", mobile);

            responseObject.add("user",     userJson);
            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "User loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to load user!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String updateUser(int userId, lk.jiat.flexzone.dto.UserDTO dto) {
        JsonObject responseObject = new JsonObject();
        Session hibernateSession  = HibernateUtil.getSessionFactory().openSession();
        Transaction transaction   = hibernateSession.beginTransaction();

        try {
            User user = hibernateSession.find(User.class, userId);

            if (user == null) {
                responseObject.addProperty("status",  false);
                responseObject.addProperty("message", "User not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            //Update basic info
            if (dto.getFirstName() != null && !dto.getFirstName().isBlank())
                user.setFirstName(dto.getFirstName());
            if (dto.getLastName() != null && !dto.getLastName().isBlank())
                user.setLastName(dto.getLastName());

            // Update role
            if (dto.getRoleValue() != null && !dto.getRoleValue().isBlank()) {
                Role role = hibernateSession
                        .createQuery("FROM Role r WHERE r.value = :val", Role.class)
                        .setParameter("val", dto.getRoleValue().toUpperCase())
                        .getSingleResultOrNull();
                if (role != null) user.setRole(role);
            }

            //Update status
            if (dto.getStatusValue() != null && !dto.getStatusValue().isBlank()) {
                Status status = hibernateSession
                        .createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", dto.getStatusValue().toUpperCase())
                        .getSingleResultOrNull();
                if (status != null) user.setStatus(status);
            }

            //Update password
            if (dto.getNewPassword() != null && !dto.getNewPassword().isBlank()) {
                if (dto.getNewPassword().equals(dto.getConfirmPassword())) {
                    user.setPassword(dto.getNewPassword());
                } else {
                    responseObject.addProperty("status",  false);
                    responseObject.addProperty("message", "Passwords do not match!");
                    transaction.rollback();
                    return AppUtil.GSON.toJson(responseObject);
                }
            }

            hibernateSession.merge(user);
            transaction.commit();

            responseObject.addProperty("status",  true);
            responseObject.addProperty("message", "User updated successfully!");

        } catch (Exception e) {
            transaction.rollback();
            e.printStackTrace();
            responseObject.addProperty("status",  false);
            responseObject.addProperty("message", "Failed to update user!");
        } finally {
            hibernateSession.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }
}
