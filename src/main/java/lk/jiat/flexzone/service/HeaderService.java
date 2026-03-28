package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import lk.jiat.flexzone.entity.Category;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;

import java.util.List;

public class HeaderService {

    public String loadCategories() {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session = HibernateUtil.getSessionFactory().openSession();

        List<Category> categoryList = session.createQuery("FROM Category", Category.class).getResultList();

        if (categoryList.isEmpty()) {

            message = "No categories found!";

        } else {

            JsonArray jsonArray = new JsonArray();

            for (Category category : categoryList) {

                Long productCount = session.createQuery(
                                "SELECT COUNT(p) FROM Product p WHERE p.category.id = :cid", Long.class)
                        .setParameter("cid", category.getId())
                        .getSingleResult();

                JsonObject obj = new JsonObject();
                obj.addProperty("id", category.getId());
                obj.addProperty("name", category.getName());
                obj.addProperty("image_path", category.getImagePath());
                obj.addProperty("productCount", productCount);

                jsonArray.add(obj);
            }

            responseObject.add("categories", jsonArray);

            status = true;
            message = "Categories loaded successfully!";
        }

        session.close();

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.GSON.toJson(responseObject);
    }

}
