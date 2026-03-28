package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpSession;
import jakarta.ws.rs.core.Context;
import lk.jiat.flexzone.dto.ProvinceDTO;
import lk.jiat.flexzone.dto.UserAddressDTO;
import lk.jiat.flexzone.entity.Address;
import lk.jiat.flexzone.entity.Province;
import lk.jiat.flexzone.entity.Status;
import lk.jiat.flexzone.entity.User;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import lk.jiat.flexzone.validation.Validator;
import org.hibernate.HibernateException;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.util.ArrayList;
import java.util.List;

public class AddressService {

    public static String getAllProvince() {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session = HibernateUtil.getSessionFactory().openSession();

        List<Province> provinceList =
                session.createQuery("FROM Province", Province.class)
                        .getResultList();

        if (provinceList.isEmpty()) {
            message = "No departments found!";
        } else {

            List<ProvinceDTO> dtoList = new ArrayList<>();

            for (Province province : provinceList) {

                ProvinceDTO dto = new ProvinceDTO();

                dto.setPid(province.getPid());
                dto.setProvinces(province.getProvinces());

                dtoList.add(dto);
            }

            responseObject.add("provinces",
                    AppUtil.GSON.toJsonTree(dtoList));

            status = true;
            message = "Provinces loaded successfully!";

        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        session.close();
        return AppUtil.GSON.toJson(responseObject);
    }

    public String addAddress(UserAddressDTO userAddressDTO, @Context HttpServletRequest request) {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        if (userAddressDTO.getLineOne() == null || userAddressDTO.getLineOne().isBlank()) {
            message = "Address 1 is required!";
        } else if (userAddressDTO.getLineTwo() == null || userAddressDTO.getLineTwo().isBlank()) {
            message = "Address 2 is Required!";
        } else if (userAddressDTO.getCity() == null || userAddressDTO.getCity().isBlank()) {
            message = "City is Required!";
        } else if (userAddressDTO.getProvinceId() <= 0) {
            message = "Province is Required!";
        } else if (userAddressDTO.getPostalCode() == null || userAddressDTO.getPostalCode().isBlank()) {
            message = "Postal Code is required!";
        } else if (!userAddressDTO.getPostalCode().matches(Validator.POSTAL_CODE_VALIDATION)) {
            message = "Enter a valid postal code!";
        } else if (userAddressDTO.getMobile() == null || userAddressDTO.getMobile().isBlank()) {
            message = "Mobile is required!";
        } else if (!userAddressDTO.getMobile().matches(Validator.MOBILE_VALIDATION)) {
            message = "Enter a valid mobile number!";
        } else {

            HttpSession httpSession = request.getSession(false);
            if (httpSession == null) {
                message = "Please login first";
            } else if (httpSession.getAttribute("user") == null) {
                message = "Please login first";
            } else {
                User sessionUser = (User) httpSession.getAttribute("user");
                Session hibernateSession = HibernateUtil.getSessionFactory().openSession();
                User dbUser = hibernateSession.find(User.class, sessionUser.getId());

                Province province = hibernateSession.get(Province.class, userAddressDTO.getProvinceId());

                Status activeStatus = hibernateSession.createQuery("FROM Status WHERE value = :value", Status.class)
                                .setParameter("value", "ACTIVE").uniqueResult();

                List<Address> addressList = hibernateSession.createQuery("FROM Address a WHERE a.user=:user", Address.class)
                        .setParameter("user", dbUser).getResultList();

                if (addressList.size() >= 2) {
                    message = "You can only add 2 addresses!";
                } else {
                    Address address = new Address();

                    address.setLineOne(userAddressDTO.getLineOne());
                    address.setLineTwo(userAddressDTO.getLineTwo());
                    address.setCity(userAddressDTO.getCity());
                    address.setPostalCode(userAddressDTO.getPostalCode());
                    address.setMobile(userAddressDTO.getMobile());
                    address.setUser(dbUser);
                    address.setProvince(province);
                    address.setStatus(activeStatus);

                    Transaction transaction = hibernateSession.beginTransaction();
                    try {
                        hibernateSession.persist(address);
                        transaction.commit();
                        status = true;
                        message = "Address added successfully!";

                    } catch (HibernateException e) {
                        transaction.rollback();
                        message = "Address adding failed!";
                    }
                }
                hibernateSession.close();
            }
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);
        return AppUtil.GSON.toJson(responseObject);
    }

    public String loadUserAddress(HttpServletRequest request) {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        HttpSession sessionUser = request.getSession(false);
        if (sessionUser == null || sessionUser.getAttribute("user") == null) {
            message = "Please login first";
        } else {
            User user = (User) sessionUser.getAttribute("user");
            Session session = HibernateUtil.getSessionFactory().openSession();
            User dbUser = session.get(User.class, user.getId());

            List<Address> addressList = session.createQuery(
                            "FROM Address a WHERE a.user=:user AND a.status.value = :status",
                            Address.class)
                    .setParameter("user", dbUser)
                    .setParameter("status", "ACTIVE")
                    .getResultList();

            if (addressList.isEmpty()) {
                message = "No addresses found!";
            } else {

                List<UserAddressDTO> dtoList = new ArrayList<>();
                for (Address address : addressList) {
                    UserAddressDTO dto = new UserAddressDTO();

                    dto.setId(address.getId());
                    dto.setLineOne(address.getLineOne());
                    dto.setLineTwo(address.getLineTwo());
                    dto.setCity(address.getCity());
                    dto.setPostalCode(address.getPostalCode());
                    dto.setMobile(address.getMobile());

                    ProvinceDTO provinceDTO = new ProvinceDTO();
                    provinceDTO.setPid(address.getProvince().getPid());
                    provinceDTO.setProvinces(address.getProvince().getProvinces());

                    dto.setProvince(provinceDTO);

                    dtoList.add(dto);
                }
                responseObject.add("addresses", AppUtil.GSON.toJsonTree(dtoList));

                status = true;
                message = "Addresses loaded successfully!";
                session.close();
            }
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.GSON.toJson(responseObject);
    }

    public String updateAddress(UserAddressDTO userAddressDTO, @Context HttpServletRequest request) {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        if (userAddressDTO.getLineOne() == null || userAddressDTO.getLineOne().isBlank()) {
            message = "Address 1 is required!";
        } else if (userAddressDTO.getLineTwo() == null || userAddressDTO.getLineTwo().isBlank()) {
            message = "Address 2 is Required!";
        } else if (userAddressDTO.getCity() == null || userAddressDTO.getCity().isBlank()) {
            message = "City is Required!";
        } else if (userAddressDTO.getProvinceId() <= 0) {
            message = "Province is Required!";
        } else if (userAddressDTO.getPostalCode() == null || userAddressDTO.getPostalCode().isBlank()) {
            message = "Postal Code is required!";
        } else if (!userAddressDTO.getPostalCode().matches(Validator.POSTAL_CODE_VALIDATION)) {
            message = "Enter a valid postal code!";
        } else if (userAddressDTO.getMobile() == null || userAddressDTO.getMobile().isBlank()) {
            message = "Mobile is required!";
        } else if (!userAddressDTO.getMobile().matches(Validator.MOBILE_VALIDATION)) {
            message = "Enter a valid mobile number!";
        } else {

            HttpSession httpSession = request.getSession(false);

            if (httpSession == null || httpSession.getAttribute("user") == null) {

                message = "Please login first";

            } else {

                User sessionUser = (User) httpSession.getAttribute("user");

                Session hibernateSession = HibernateUtil.getSessionFactory().openSession();

                Address address = hibernateSession.get(Address.class, userAddressDTO.getId());

                if (address == null) {

                    message = "Address not found!";

                } else if (address.getUser().getId() != sessionUser.getId()) {

                    message = "Unauthorized action!";

                } else {

                    Province province = hibernateSession.get(Province.class, userAddressDTO.getProvinceId());

                    address.setLineOne(userAddressDTO.getLineOne());
                    address.setLineTwo(userAddressDTO.getLineTwo());
                    address.setCity(userAddressDTO.getCity());
                    address.setPostalCode(userAddressDTO.getPostalCode());
                    address.setMobile(userAddressDTO.getMobile());
                    address.setProvince(province);

                    Transaction transaction = hibernateSession.beginTransaction();

                    try {

                        hibernateSession.merge(address);
                        transaction.commit();

                        status = true;
                        message = "Address updated successfully!";

                    } catch (HibernateException e) {

                        transaction.rollback();
                        message = "Address updating failed!";

                    }
                }

                hibernateSession.close();
            }
        }
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.GSON.toJson(responseObject);
    }

    public String deleteEmployee(int id) {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session =
                HibernateUtil.getSessionFactory().openSession();

        Transaction tx = session.beginTransaction();

        Address address = session.get(Address.class, id);

        if (address == null) {

            message = "Employee not found!";

        } else {

            Status inactiveStatus = session
                    .createQuery("FROM Status s WHERE s.value = :value", Status.class)
                    .setParameter("value", "INACTIVE")
                    .uniqueResult();

            if (inactiveStatus == null) {
                message = "Inactive status not found in database!";
            } else {
                address.setStatus(inactiveStatus);
                tx.commit();

                status = true;
                message = "Employee delete successfully!";
            }
        }
        session.close();
        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.GSON.toJson(responseObject);
    }

}
