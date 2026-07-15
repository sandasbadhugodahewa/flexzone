package lk.jiat.flexzone.service;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import lk.jiat.flexzone.dto.ProductDTO;
import lk.jiat.flexzone.dto.StockDTO;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.glassfish.jersey.media.multipart.FormDataBodyPart;
import org.hibernate.Session;
import org.hibernate.Transaction;

import java.io.File;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AdminProductService {

    private static final int PAGE_SIZE = 8;
    private static final DateTimeFormatter FMT = DateTimeFormatter.ofPattern("dd MMM yyyy");

    public String getProductList(String filter, String search, int page) {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            StringBuilder hql = new StringBuilder("FROM Product p WHERE 1=1 ");
            StringBuilder countHql = new StringBuilder("SELECT COUNT(p) FROM Product p WHERE 1=1 ");

            if (search != null && !search.isBlank()) {
                String cond = " AND (LOWER(p.title) LIKE :search OR LOWER(p.brand.name) LIKE :search) ";
                hql.append(cond);
                countHql.append(cond);
            }

            if (filter == null || filter.equals("all")) {
                // show all products regardless of status
            } else if (filter.equals("active")) {
                hql.append(" AND p.status.value = 'ACTIVE' ");
                countHql.append(" AND p.status.value = 'ACTIVE' ");
            } else if (filter.equals("inactive")) {
                hql.append(" AND p.status.value = 'INACTIVE' ");
                countHql.append(" AND p.status.value = 'INACTIVE' ");
            }

            hql.append("ORDER BY p.id DESC");

            // Count
            var countQuery = session.createQuery(countHql.toString(), Long.class);
            if (search != null && !search.isBlank())
                countQuery.setParameter("search", "%" + search.toLowerCase() + "%");
            long totalCount = countQuery.getSingleResult();

            // Tab counts
            long totalAll = countAllProducts(session);
            long totalActive = countByStatus(session, "ACTIVE");
            long totalInactive = countByStatus(session, "INACTIVE");

            // Products
            var productQuery = session.createQuery(hql.toString(), Product.class);
            if (search != null && !search.isBlank())
                productQuery.setParameter("search", "%" + search.toLowerCase() + "%");
            productQuery.setFirstResult(page * PAGE_SIZE);
            productQuery.setMaxResults(PAGE_SIZE);

            List<Product> products = productQuery.getResultList();

            JsonArray productArray = new JsonArray();
            long totalLowStock = 0;
            long totalOutOfStock = 0;

            Map<Integer, Integer> soldQtyMap = getSoldQtyMap(session);

            for (Product p : products) {
                JsonObject pJson = new JsonObject();
                pJson.addProperty("id", p.getId());
                pJson.addProperty("title", p.getTitle());
                pJson.addProperty("categoryName", p.getCategory() != null ? p.getCategory().getName() : "—");
                pJson.addProperty("subcatName", p.getSubcategory() != null ? p.getSubcategory().getName() : "—");
                pJson.addProperty("brandName", p.getBrand() != null ? p.getBrand().getName() : "—");
                pJson.addProperty("colorValue", p.getColor() != null ? p.getColor().getValue() : "—");
                pJson.addProperty("colorHex", p.getColor() != null ? p.getColor().getHexCode() : "#ccc");
                int totalSold = 0;
                pJson.addProperty("status",
                        p.getStatus() != null ? p.getStatus().getValue() : "INACTIVE");
                pJson.addProperty("createdAt",
                        p.getCreatedAt() != null ? p.getCreatedAt().format(FMT) : "—");

                //First image
                String image = (p.getImages() != null && !p.getImages().isEmpty())
                        ? p.getImages().get(0) : "";
                pJson.addProperty("image", image);

                //Stock
                int totalQty = 0;
                double minPrice = Double.MAX_VALUE, maxPrice = 0;
                for (Stock s : p.getStocks()) {
                    int soldQty = soldQtyMap.getOrDefault(s.getId(), 0);
                    totalSold += soldQty;

                    totalQty += s.getQuantity();
                    if (s.getPrice() < minPrice) minPrice = s.getPrice();
                    if (s.getPrice() > maxPrice) maxPrice = s.getPrice();
                }

                pJson.addProperty("totalStock", totalQty);
                pJson.addProperty("soldCount", totalSold);
                pJson.addProperty("minPrice", minPrice == Double.MAX_VALUE ? 0 : minPrice);
                pJson.addProperty("maxPrice", maxPrice);
                pJson.addProperty("stockVariants", p.getStocks().size());

                if (totalQty == 0) totalOutOfStock++;
                else if (totalQty <= 10) totalLowStock++;

                productArray.add(pJson);
            }

            responseObject.add("products", productArray);
            responseObject.addProperty("totalCount", totalCount);
            responseObject.addProperty("currentPage", page);
            responseObject.addProperty("pageSize", PAGE_SIZE);
            responseObject.addProperty("totalAll", totalAll);
            responseObject.addProperty("totalActive", totalActive);
            responseObject.addProperty("totalInactive", totalInactive);
            responseObject.addProperty("totalLowStock", totalLowStock);
            responseObject.addProperty("totalOutOfStock", totalOutOfStock);
            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Products loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load products!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String getSingleProduct(int productId) {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            Product p = session.find(Product.class, productId);

            if (p == null) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Product not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            int totalSold = 0;

            JsonObject pJson = new JsonObject();
            pJson.addProperty("id", p.getId());
            pJson.addProperty("title", p.getTitle());
            pJson.addProperty("description", p.getDescription() != null ? p.getDescription() : "");
            pJson.addProperty("categoryName", p.getCategory() != null ? p.getCategory().getName() : "—");
            pJson.addProperty("categoryId", p.getCategory() != null ? p.getCategory().getId() : 0);
            pJson.addProperty("subcatName", p.getSubcategory() != null ? p.getSubcategory().getName() : "—");
            pJson.addProperty("subcatId", p.getSubcategory() != null ? p.getSubcategory().getId() : 0);
            pJson.addProperty("brandName", p.getBrand() != null ? p.getBrand().getName() : "—");
            pJson.addProperty("brandId", p.getBrand() != null ? p.getBrand().getId() : 0);
            pJson.addProperty("colorValue", p.getColor() != null ? p.getColor().getValue() : "—");
            pJson.addProperty("colorHex", p.getColor() != null ? p.getColor().getHexCode() : "#ccc");
            pJson.addProperty("colorId", p.getColor() != null ? p.getColor().getId() : 0);
            pJson.addProperty("genderName", p.getGender() != null ? p.getGender().getName() : "—");
            pJson.addProperty("genderId", p.getGender() != null ? p.getGender().getId() : 0);
            pJson.addProperty("status",
                    p.getStatus() != null ? p.getStatus().getValue() : "INACTIVE");
            pJson.addProperty("createdAt",
                    p.getCreatedAt() != null ? p.getCreatedAt().format(FMT) : "—");
            pJson.addProperty("updatedAt",
                    p.getUpdatedAt() != null ? p.getUpdatedAt().format(FMT) : "—");
            pJson.addProperty("product_details", p.getProductDetails() != null ? p.getProductDetails() : "");

            // Images array
            JsonArray imagesArray = new JsonArray();
            if (p.getImages() != null) p.getImages().forEach(imagesArray::add);
            pJson.add("images", imagesArray);

            // Stocks
            Map<Integer, Integer> soldQtyMap = getSoldQtyMap(session);
            JsonArray stockArray = new JsonArray();
            double minPrice = Double.MAX_VALUE, maxPrice = 0;
            int totalQty = 0;

            for (Stock s : p.getStocks()) {
                JsonObject sJson = new JsonObject();
                int soldQty = soldQtyMap.getOrDefault(s.getId(), 0);
                sJson.addProperty("stockId", s.getId());
                sJson.addProperty("price", s.getPrice());
                sJson.addProperty("quantity", s.getQuantity());
                sJson.addProperty("sizeValue", s.getSize() != null ? s.getSize().getValue() : "—");
                sJson.addProperty("sizeId", s.getSize() != null ? s.getSize().getId() : 0);
                sJson.addProperty("statusId", s.getStatus() != null ? s.getStatus().getId() : 0);

                sJson.addProperty("soldCount", soldQty);
                totalSold = totalSold + soldQty;

                if (s.getDiscount() != null) {
                    sJson.addProperty("discountId", s.getDiscount().getId());
                    sJson.addProperty("discountValue", s.getDiscount().getValue());
                    sJson.addProperty("couponCode", s.getDiscount().getCouponCode());
                }

                stockArray.add(sJson);
                totalQty += s.getQuantity();
                if (s.getPrice() < minPrice) minPrice = s.getPrice();
                if (s.getPrice() > maxPrice) maxPrice = s.getPrice();
            }

            pJson.add("stocks", stockArray);
            pJson.addProperty("totalStock", totalQty);
            pJson.addProperty("minPrice", minPrice == Double.MAX_VALUE ? 0 : minPrice);
            pJson.addProperty("maxPrice", maxPrice);
            pJson.addProperty("soldCount", totalSold);

            responseObject.add("singleProduct", pJson);
            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Product loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load product!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String getFormData() {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();

        try {
            responseObject.add("categories", toIdNameArray(session.createQuery("FROM Category", Category.class).getResultList(), "id", "name"));
            responseObject.add("subcategories", toIdNameArray(session.createQuery("FROM Subcategory", Subcategory.class).getResultList(), "id", "name"));
            responseObject.add("brands", toIdNameArray(session.createQuery("FROM Brand", Brand.class).getResultList(), "id", "name"));
            responseObject.add("genders", toIdNameArray(session.createQuery("FROM Gender", Gender.class).getResultList(), "id", "name"));
            responseObject.add("sizes", toIdNameArray(session.createQuery("FROM Size", Size.class).getResultList(), "id", "value"));

            List<Color> colors = session.createQuery("FROM Color", Color.class).getResultList();
            JsonArray colorArray = new JsonArray();
            for (Color c : colors) {
                JsonObject o = new JsonObject();
                o.addProperty("id", c.getId());
                o.addProperty("value", c.getValue());
                o.addProperty("hexCode", c.getHexCode() != null ? c.getHexCode() : "#ccc");
                colorArray.add(o);
            }
            responseObject.add("colors", colorArray);

            List<Discount> discounts = session.createQuery("FROM Discount", Discount.class).getResultList();
            JsonArray discArray = new JsonArray();
            for (Discount d : discounts) {
                JsonObject o = new JsonObject();
                o.addProperty("id", d.getId());
                o.addProperty("couponCode", d.getCouponCode());
                o.addProperty("value", d.getValue());
                discArray.add(o);
            }
            responseObject.add("discounts", discArray);

            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Form data loaded!");

        } catch (Exception e) {
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Failed to load form data!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String updateStatus(int productId, String newStatus) {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        Transaction tx = session.beginTransaction();

        try {
            Product p = session.find(Product.class, productId);
            if (p == null) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Product not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            Status status = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", newStatus)
                    .getSingleResult();

            p.setStatus(status);
            session.merge(p);
            tx.commit();

            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Product status updated to " + newStatus + "!");

        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Status update failed!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    public String updateStockStatus(int stockId, String newStatus) {
        JsonObject response = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        Transaction tx = session.beginTransaction();
        try {
            Stock stock = session.find(Stock.class, stockId);
            if (stock == null) {
                response.addProperty("status", false);
                response.addProperty("message", "Stock not found!");
                return AppUtil.GSON.toJson(response);
            }
            Status status = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", newStatus).getSingleResult();
            stock.setStatus(status);
            session.merge(stock);
            tx.commit();
            response.addProperty("status", true);
            response.addProperty("message", "Stock status updated!");
        } catch (Exception e) {
            tx.rollback();
            response.addProperty("status", false);
            response.addProperty("message", "Update failed!");
            e.printStackTrace();
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(response);
    }

    public String deleteProduct(int productId) {
        JsonObject responseObject = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        Transaction tx = session.beginTransaction();

        try {
            Product p = session.find(Product.class, productId);
            if (p == null) {
                responseObject.addProperty("status", false);
                responseObject.addProperty("message", "Product not found!");
                return AppUtil.GSON.toJson(responseObject);
            }

            Status blocked = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", "BLOCKED")
                    .getSingleResult();

            p.setStatus(blocked);
            session.merge(p);
            tx.commit();

            responseObject.addProperty("status", true);
            responseObject.addProperty("message", "Product deleted successfully!");

        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            responseObject.addProperty("status", false);
            responseObject.addProperty("message", "Delete failed!");
        } finally {
            session.close();
        }

        return AppUtil.GSON.toJson(responseObject);
    }

    private Map<Integer, Integer> getSoldQtyMap(Session session) {

        List<Object[]> results = session.createQuery(
                "SELECT oi.stock.id, COALESCE(SUM(oi.qty), 0) " +
                        "FROM OrderItem oi " +
                        "GROUP BY oi.stock.id",
                Object[].class
        ).getResultList();

        Map<Integer, Integer> soldMap = new HashMap<>();

        for (Object[] row : results) {
            Integer stockId = (Integer) row[0];
            Long qty = (Long) row[1];

            soldMap.put(stockId, qty != null ? qty.intValue() : 0);
        }

        return soldMap;
    }

    private long countAllProducts(Session session) {
        return session.createQuery("SELECT COUNT(p) FROM Product p", Long.class)
                .getSingleResult();
    }

    private long countByStatus(Session session, String statusValue) {
        return session.createQuery(
                        "SELECT COUNT(p) FROM Product p WHERE p.status.value = :val", Long.class)
                .setParameter("val", statusValue)
                .getSingleResult();
    }

    private <T> JsonArray toIdNameArray(List<T> list, String idMethod, String nameMethod) {
        JsonArray arr = new JsonArray();
        for (T item : list) {
            try {
                JsonObject o = new JsonObject();
                o.addProperty("id", (int) item.getClass().getMethod("getId").invoke(item));
                String nameVal = (String) item.getClass().getMethod(
                        "get" + Character.toUpperCase(nameMethod.charAt(0)) + nameMethod.substring(1)
                ).invoke(item);
                o.addProperty("name", nameVal != null ? nameVal : "");
                arr.add(o);
            } catch (Exception ignored) {
            }
        }
        return arr;
    }

    //Publish Product
    public String createProduct(String productJson, List<FormDataBodyPart> imageParts) {

        JsonObject response = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        Transaction tx = session.beginTransaction();
        String message;

        try {
            ProductDTO dto = AppUtil.GSON.fromJson(productJson, ProductDTO.class);

            Product p = new Product();
            p.setTitle(dto.getTitle());
            p.setDescription(dto.getDescription());
            p.setCreatedAt(LocalDateTime.now());

            p.setCategory(session.find(Category.class, dto.getCategoryId()));
            if (dto.getSubCategoryId() == 0) {
                throw new RuntimeException("SubCategory is required!");
            }
            Subcategory sub = session.find(Subcategory.class, dto.getSubCategoryId());
            if (sub == null) {
                throw new RuntimeException("Invalid SubCategory ID!");
            }
            p.setSubcategory(sub);
            p.setBrand(session.find(Brand.class, dto.getBrandId()));
            p.setColor(session.find(Color.class, dto.getColorId()));
            p.setGender(session.find(Gender.class, dto.getGenderId()));

            Status status = session.createNamedQuery("Status.findByValue", Status.class)
                    .setParameter("value", dto.getStatus())
                    .getSingleResult();

            p.setStatus(status);

            if (dto.getProductDetails() != null) {
                p.setProductDetails(AppUtil.GSON.toJson(dto.getProductDetails()));
            }

            session.persist(p);

            List<String> imageNames = saveImages(imageParts);

            if (imageNames != null) {
                for (String img : imageNames) {
                    p.getImages().add(img);
                }
            }

            if (dto.getStockDTOList() != null) {
                for (StockDTO s : dto.getStockDTOList()) {

                    Stock stock = new Stock();
                    stock.setProduct(p);
                    stock.setPrice(s.getPrice());
                    stock.setQuantity(s.getQuantity());

                    stock.setSize(session.find(Size.class, s.getSizeId()));

                    if (s.getDiscountId() != null) {
                        Discount discount = session.find(Discount.class, s.getDiscountId());

                        if (discount == null) {
                            throw new RuntimeException("Invalid discount ID!");
                        }

                        stock.setDiscount(discount);
                    }

                    Status stockStatus = session.createNamedQuery("Status.findByValue", Status.class)
                            .setParameter("value", "ACTIVE").getSingleResult();

                    stock.setStatus(stockStatus);
                    session.persist(stock);
                }
            }

            tx.commit();
            message = "Product created successfully!";

            response.addProperty("status", true);
            response.addProperty("message", message);

        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            response.addProperty("status", false);
            response.addProperty("message", "Product creation failed!");
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(response);
    }

//    public String createProduct(String productJson, List<FormDataBodyPart> imageParts) {
//
//        JsonObject response = new JsonObject();
//
//        boolean status = false;
//        String message;
//
//        Session session = HibernateUtil.getSessionFactory().openSession();
//        Transaction tx = null;
//
//        try {
//            ProductDTO dto = AppUtil.GSON.fromJson(productJson, ProductDTO.class);
//
//            if (dto.getTitle() == null) {
//                message = "Title is required!";
//            } else if (dto.getTitle().isBlank()) {
//                message = "Title cannot be empty!";
//            } else if (dto.getTitle().length() > 35) {
//                message = "Title must be less than 35 characters!";
//            } else if (dto.getDescription() == null) {
//                message = "Description is required!";
//            } else if (dto.getDescription().isBlank()) {
//                message = "Description cannot be empty!";
//            } else if (dto.getCategoryId() == 0) {
//                message = "Category is required!";
//            } else if (dto.getSubCategoryId() == 0) {
//                message = "SubCategory is required!";
//            } else if (dto.getBrandId() == 0) {
//                message = "Brand is required!";
//            } else if (dto.getColorId() == 0) {
//                message = "Color is required!";
//            } else if (dto.getGenderId() == 0) {
//                message = "Gender is required!";
//            } else if (dto.getStatus() == null || dto.getStatus().isBlank()) {
//                message = "Status is required!";
//            } else if (dto.getStockDTOList() == null || dto.getStockDTOList().isEmpty()) {
//                message = "At least one stock item is required!";
//            } else {
//
//                // 🔴 START DB LOGIC ONLY IF VALIDATION PASSED
//                tx = session.beginTransaction();
//
//                Product p = new Product();
//                p.setTitle(dto.getTitle());
//                p.setDescription(dto.getDescription());
//                p.setCreatedAt(LocalDateTime.now());
//
//                p.setCategory(session.find(Category.class, dto.getCategoryId()));
//
//                Subcategory sub = session.find(Subcategory.class, dto.getSubCategoryId());
//                if (sub == null) {
//                    throw new RuntimeException("Invalid SubCategory ID!");
//                }
//                p.setSubcategory(sub);
//
//                p.setBrand(session.find(Brand.class, dto.getBrandId()));
//                p.setColor(session.find(Color.class, dto.getColorId()));
//                p.setGender(session.find(Gender.class, dto.getGenderId()));
//
//                Status statusEntity = session.createNamedQuery("Status.findByValue", Status.class)
//                        .setParameter("value", dto.getStatus())
//                        .getSingleResult();
//
//                p.setStatus(statusEntity);
//
//                if (dto.getProductDetails() != null) {
//                    p.setProductDetails(AppUtil.GSON.toJson(dto.getProductDetails()));
//                }
//
//                session.persist(p);
//
//                // 🔹 Images
//                List<String> imageNames = saveImages(imageParts);
//                if (imageNames != null) {
//                    for (String img : imageNames) {
//                        p.getImages().add(img);
//                    }
//                }
//
//                // 🔹 Stocks
//                for (StockDTO s : dto.getStockDTOList()) {
//
//                    if (s.getSizeId() == 0) {
//                        throw new RuntimeException("Size is required in stock!");
//                    }
//
//                    Stock stock = new Stock();
//                    stock.setProduct(p);
//                    stock.setPrice(s.getPrice());
//                    stock.setQuantity(s.getQuantity());
//
//                    stock.setSize(session.find(Size.class, s.getSizeId()));
//
//                    if (s.getDiscountId() != null) {
//                        Discount discount = session.find(Discount.class, s.getDiscountId());
//
//                        if (discount == null) {
//                            throw new RuntimeException("Invalid discount ID!");
//                        }
//
//                        stock.setDiscount(discount);
//                    }
//
//                    Status stockStatus = session.createNamedQuery("Status.findByValue", Status.class)
//                            .setParameter("value", "ACTIVE")
//                            .getSingleResult();
//
//                    stock.setStatus(stockStatus);
//
//                    session.persist(stock);
//                }
//
//                tx.commit();
//
//                status = true;
//                message = "Product created successfully!";
//            }
//
//        } catch (Exception e) {
//
//            if (tx != null) tx.rollback();
//
//            e.printStackTrace();
//            message = "Product creation failed!";
//
//        } finally {
//            session.close();
//        }
//
//        response.addProperty("status", status);
//        response.addProperty("message", message);
//
//        return AppUtil.GSON.toJson(response);
//    }

    private List<String> saveImages(List<FormDataBodyPart> imageParts) {

        List<String> fileNames = new ArrayList<>();

        if (imageParts == null || imageParts.isEmpty()) return fileNames;

        String uploadPath = "C:/Users/DELL/IdeaProjects/WEB 2/FlexZone/src/main/webapp/assets/images/productImg/";

        try {

            File dir = new File(uploadPath);
            if (!dir.exists()) dir.mkdirs();

            for (FormDataBodyPart part : imageParts) {

                InputStream inputStream = part.getValueAs(InputStream.class);

                String originalName = part.getContentDisposition().getFileName();

                originalName = originalName.replaceAll("[^a-zA-Z0-9\\.\\-_]", "_");

                String fileName = System.currentTimeMillis() + "_" + originalName;

                File file = new File(uploadPath, fileName);

                Files.copy(inputStream, file.toPath(), StandardCopyOption.REPLACE_EXISTING);

                fileNames.add(fileName);
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
        return fileNames;
    }

    public String updateProduct(int productId, String productJson,
                                List<FormDataBodyPart> imageParts) {
        JsonObject response = new JsonObject();
        Session session = HibernateUtil.getSessionFactory().openSession();
        Transaction tx = session.beginTransaction();

        try {
            ProductDTO dto = AppUtil.GSON.fromJson(productJson, ProductDTO.class);
            Product p = session.find(Product.class, productId);

            if (p == null) throw new RuntimeException("Product not found!");

            p.setTitle(dto.getTitle());
            p.setDescription(dto.getDescription());
            p.setCategory(session.find(Category.class, dto.getCategoryId()));
            p.setBrand(session.find(Brand.class, dto.getBrandId()));
            p.setColor(session.find(Color.class, dto.getColorId()));
            p.setGender(session.find(Gender.class, dto.getGenderId()));

            Subcategory sub = session.find(Subcategory.class, dto.getSubCategoryId());
            if (sub == null) throw new RuntimeException("Invalid SubCategory ID!");
            p.setSubcategory(sub);

            if (dto.getStatus() != null && !dto.getStatus().isBlank()) {
                Status status = session.createNamedQuery("Status.findByValue", Status.class)
                        .setParameter("value", dto.getStatus())
                        .getSingleResult();
                p.setStatus(status);
            }

            if (dto.getProductDetails() != null) {
                p.setProductDetails(AppUtil.GSON.toJson(dto.getProductDetails()));
            } else {
                p.setProductDetails(null);
            }

            session.createNativeQuery("DELETE FROM product_images WHERE pr_id = :pid")
                    .setParameter("pid", productId)
                    .executeUpdate();

            p = session.find(Product.class, productId);

            List<String> updatedImages = new ArrayList<>();

            if (dto.getKeptImages() != null) {
                updatedImages.addAll(dto.getKeptImages());
            }
            List<String> newImageNames = saveImages(imageParts);
            if (newImageNames != null) {
                updatedImages.addAll(newImageNames);
            }
            p.setImages(updatedImages);

            Product product = session.find(Product.class, productId);

            if (dto.getStockDTOList() != null) {

                for (StockDTO s : dto.getStockDTOList()) {

                    if (s.getStockId() > 0) {

                        Stock stock = session.find(Stock.class, s.getStockId());
                        if (stock != null) {

                            stock.setPrice(s.getPrice());
                            stock.setQuantity(s.getQuantity());

                            if (s.getDiscountId() != null) {
                                Discount discount = session.find(Discount.class, s.getDiscountId());
                                stock.setDiscount(discount);
                            } else {
                                stock.setDiscount(null);
                            }
                            session.merge(stock);
                        }

                    } else {
                        Status stockStatus = session.createNamedQuery("Status.findByValue", Status.class)
                                .setParameter("value", "ACTIVE")
                                .getSingleResult();

                        Stock stock = new Stock();

                        stock.setProduct(product);
                        stock.setPrice(s.getPrice());
                        stock.setQuantity(s.getQuantity());
                        stock.setStatus(stockStatus);

                        stock.setSize(
                                session.find(Size.class, s.getSizeId())
                        );
                        if (s.getDiscountId() != null) {
                            Discount discount = session.find(Discount.class, s.getDiscountId());
                            stock.setDiscount(discount);
                        }
                        session.persist(stock);
                    }
                }
            }
            session.merge(p);
            tx.commit();

            response.addProperty("status", true);
            response.addProperty("message", "Product updated successfully!");
        } catch (Exception e) {
            tx.rollback();
            e.printStackTrace();
            response.addProperty("status", false);
            response.addProperty("message", "Update failed: " + e.getMessage());
        } finally {
            session.close();
        }
        return AppUtil.GSON.toJson(response);
    }

}
