package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;
import org.hibernate.query.Query;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AdvancedSearchService {

    private static final int MAX_RESULT = 9;

    public String getAllData() {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            // Filter options
            List<Brand>       brands     = session.createQuery("FROM Brand",    Brand.class).getResultList();
            List<Color>       colors     = session.createQuery("FROM Color",    Color.class).getResultList();
            List<Size>        sizes      = session.createQuery("FROM Size",     Size.class).getResultList();
            List<Gender>      genders    = session.createQuery("FROM Gender",   Gender.class).getResultList();
            List<Subcategory> subcats    = session.createQuery("FROM Subcategory", Subcategory.class).getResultList();

            // Price range
            Double minPrice = session.createQuery("SELECT MIN(s.price) FROM Stock s", Double.class).uniqueResult();
            Double maxPrice = session.createQuery("SELECT MAX(s.price) FROM Stock s", Double.class).uniqueResult();

            // First page products
            Status activeStatus = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", Status.Type.ACTIVE.name())
                    .getSingleResult();

            Query<Stock> stockQuery = session.createQuery(
                            "FROM Stock s WHERE s.status = :status ORDER BY s.id ASC", Stock.class)
                    .setParameter("status", activeStatus);

            long allProductCount = (long) stockQuery.getResultList().size();
            stockQuery.setFirstResult(0);
            stockQuery.setMaxResults(MAX_RESULT);

            responseObject.add("brandList",    AppUtil.GSON.toJsonTree(buildBrandList(brands)));
            responseObject.add("colorList",    AppUtil.GSON.toJsonTree(buildColorList(colors)));
            responseObject.add("sizeList",     AppUtil.GSON.toJsonTree(buildSizeList(sizes)));
            responseObject.add("genderList",   AppUtil.GSON.toJsonTree(buildGenderList(genders)));
            responseObject.add("subcatList",   AppUtil.GSON.toJsonTree(buildSubcatList(subcats)));
            responseObject.add("productList",  AppUtil.GSON.toJsonTree(generateProductDTOs(stockQuery)));
            responseObject.addProperty("allProductCount", allProductCount);
            responseObject.addProperty("maxResult",       MAX_RESULT);
            responseObject.addProperty("minPrice",        minPrice != null ? minPrice : 0);
            responseObject.addProperty("maxPrice",        maxPrice != null ? maxPrice : 50000);
            responseObject.addProperty("status",          true);
            responseObject.addProperty("message",         "Data loaded!");

        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }


    // ─────────────────────────────────────────────
    //  SEARCH WITH FILTERS
    // ─────────────────────────────────────────────
    public String searchProducts(JsonObject req) {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            StringBuilder query    = new StringBuilder("FROM Stock s WHERE s.status.value = :status ");
            Map<String, Object> params = new HashMap<>();
            params.put("status", Status.Type.ACTIVE.name());

            // ── Keyword search ──
            if (has(req, "keyword")) {
                query.append("AND LOWER(s.product.title) LIKE :keyword ");
                params.put("keyword", "%" + req.get("keyword").getAsString().toLowerCase() + "%");
            }

            // ── Brand filter ──
            if (has(req, "brandId")) {
                query.append("AND s.product.brand.id = :brandId ");
                params.put("brandId", req.get("brandId").getAsInt());
            }

            // ── Color filter ──
            if (has(req, "colorId")) {
                query.append("AND s.product.color.id = :colorId ");
                params.put("colorId", req.get("colorId").getAsInt());
            }

            // ── Size filter ──
            if (has(req, "sizeId")) {
                query.append("AND s.size.id = :sizeId ");
                params.put("sizeId", req.get("sizeId").getAsInt());
            }

            // ── Gender filter ──
            if (has(req, "genderId")) {
                query.append("AND s.product.gender.id = :genderId ");
                params.put("genderId", req.get("genderId").getAsInt());
            }

            // ── Subcategory filter ──
            if (has(req, "subcatId")) {
                query.append("AND s.product.subcategory.id = :subcatId ");
                params.put("subcatId", req.get("subcatId").getAsInt());
            }

            // ── Price range ──
            if (has(req, "priceMin") && has(req, "priceMax")) {
                query.append("AND s.price BETWEEN :priceMin AND :priceMax ");
                params.put("priceMin", req.get("priceMin").getAsDouble());
                params.put("priceMax", req.get("priceMax").getAsDouble());
            }

            // ── Sort ──
            if (has(req, "sortValue")) {
                switch (req.get("sortValue").getAsString()) {
                    case "price-asc"  -> query.append("ORDER BY s.price ASC ");
                    case "price-desc" -> query.append("ORDER BY s.price DESC ");
                    case "name-asc"   -> query.append("ORDER BY s.product.title ASC ");
                    case "name-desc"  -> query.append("ORDER BY s.product.title DESC ");
                    case "newest"     -> query.append("ORDER BY s.createdAt DESC ");
                    default           -> query.append("ORDER BY s.id ASC ");
                }
            } else {
                query.append("ORDER BY s.id ASC ");
            }

            // Count query (no pagination)
            String countHql = query.toString().replace("FROM Stock", "SELECT COUNT(s) FROM Stock");
            Query<Long> countQuery = session.createQuery(countHql, Long.class);
            params.forEach(countQuery::setParameter);
            long totalCount = countQuery.getSingleResult();

            // Paginated query
            int firstResult = has(req, "firstResult") ? req.get("firstResult").getAsInt() : 0;
            Query<Stock> stockQuery = session.createQuery(query.toString(), Stock.class);
            params.forEach(stockQuery::setParameter);
            stockQuery.setFirstResult(firstResult);
            stockQuery.setMaxResults(MAX_RESULT);

            responseObject.add("productList",       AppUtil.GSON.toJsonTree(generateProductDTOs(stockQuery)));
            responseObject.addProperty("allProductCount", totalCount);
            responseObject.addProperty("maxResult",       MAX_RESULT);
            responseObject.addProperty("status",          true);
            responseObject.addProperty("message",         "Search completed!");

        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }


    // ─────────────────────────────────────────────
    //  HELPERS
    // ─────────────────────────────────────────────
    private boolean has(JsonObject obj, String key) {
        return obj.has(key) && !obj.get(key).isJsonNull()
                && !obj.get(key).getAsString().isBlank();
    }

    private List<JsonObject> generateProductDTOs(Query<Stock> stockQuery) {
        Session session = HibernateUtil.getSessionFactory().openSession();
        List<JsonObject> list = new ArrayList<>();
        for (Stock stock : stockQuery.getResultList()) {

            Product product = stock.getProduct();

            JsonObject item = new JsonObject();

            List<Review> reviews = session.createQuery("FROM Review r WHERE r.product.id = :pid AND r.status.value = :status",Review.class)
                    .setParameter("pid", product.getId()).setParameter("status", Status.Type.ACTIVE.name()).getResultList();

            double totalRating = 0;
            for (Review review : reviews) {
                totalRating += review.getRating();
            }
            double averageRating = reviews.isEmpty()
                    ? 0
                    : totalRating / reviews.size();

            item.addProperty("stockId",      stock.getId());
            item.addProperty("productId",    product.getId());
            item.addProperty("title",        product.getTitle());
            item.addProperty("price",        stock.getPrice());
            item.addProperty("quantity",     stock.getQuantity());
            item.addProperty("averageRating", averageRating);
            item.addProperty("totalReviews", reviews.size());
            item.addProperty("sizeValue",    stock.getSize() != null ? stock.getSize().getValue() : "");
            item.addProperty("colorValue",   product.getColor() != null ? product.getColor().getValue() : "");
            item.addProperty("colorHex",     product.getColor() != null ? product.getColor().getHexCode() : "#000");
            item.addProperty("brandName",    product.getBrand() != null ? product.getBrand().getName() : "");
            item.addProperty("categoryName", product.getCategory() != null ? product.getCategory().getName() : "");

            com.google.gson.JsonArray imgs = new com.google.gson.JsonArray();
            if (stock.getProduct().getImages() != null) {
                stock.getProduct().getImages().forEach(imgs::add);
            }
            item.add("images", imgs);
            list.add(item);
        }
        return list;
    }

    private List<JsonObject> buildBrandList(List<Brand> brands) {
        List<JsonObject> list = new ArrayList<>();
        for (Brand b : brands) {
            JsonObject o = new JsonObject();
            o.addProperty("id",   b.getId());
            o.addProperty("name", b.getName());
            list.add(o);
        }
        return list;
    }

    private List<JsonObject> buildColorList(List<Color> colors) {
        List<JsonObject> list = new ArrayList<>();
        for (Color c : colors) {
            JsonObject o = new JsonObject();
            o.addProperty("id",      c.getId());
            o.addProperty("value",   c.getValue());
            o.addProperty("hexCode", c.getHexCode());
            list.add(o);
        }
        return list;
    }

    private List<JsonObject> buildSizeList(List<Size> sizes) {
        List<JsonObject> list = new ArrayList<>();
        for (Size s : sizes) {
            JsonObject o = new JsonObject();
            o.addProperty("id",    s.getId());
            o.addProperty("value", s.getValue());
            list.add(o);
        }
        return list;
    }

    private List<JsonObject> buildGenderList(List<Gender> genders) {
        List<JsonObject> list = new ArrayList<>();
        for (Gender g : genders) {
            JsonObject o = new JsonObject();
            o.addProperty("id",   g.getId());
            o.addProperty("name", g.getName());
            list.add(o);
        }
        return list;
    }

    private List<JsonObject> buildSubcatList(List<Subcategory> subcats) {
        List<JsonObject> list = new ArrayList<>();
        for (Subcategory s : subcats) {
            JsonObject o = new JsonObject();
            o.addProperty("id",   s.getId());
            o.addProperty("name", s.getName());
            list.add(o);
        }
        return list;
    }
}
