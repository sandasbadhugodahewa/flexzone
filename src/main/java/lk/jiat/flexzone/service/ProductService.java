package lk.jiat.flexzone.service;

import com.google.gson.JsonObject;
import com.google.gson.reflect.TypeToken;
import lk.jiat.flexzone.dto.ProductDTO;
import lk.jiat.flexzone.dto.StockDTO;
import lk.jiat.flexzone.entity.*;
import lk.jiat.flexzone.util.AppUtil;
import lk.jiat.flexzone.util.HibernateUtil;
import org.hibernate.Session;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class ProductService {

    public String loadProducts(){

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session = HibernateUtil.getSessionFactory().openSession();
        Status activeStatus = session.createQuery(
                        "FROM Status WHERE value = :value", Status.class)
                .setParameter("value","ACTIVE")
                .uniqueResult();

        List<Product> productList = session.createQuery(
                        "FROM Product p WHERE p.status = :status", Product.class)
                .setParameter("status", activeStatus)
                .getResultList();

        if(productList.isEmpty()){
            message = "No products found!";
        }else{

            List<ProductDTO> dtoList = new ArrayList<>();

            for(Product product : productList){

                ProductDTO dto = new ProductDTO();

                dto.setId(product.getId());
                dto.setTitle(product.getTitle());
                dto.setDescription(product.getDescription());

                dto.setCategoryId(product.getCategory().getId());
                dto.setCategoryName(product.getCategory().getName());

                dto.setSubCategoryId(product.getSubcategory().getId());
                dto.setSubCategoryName(product.getSubcategory().getName());

                dto.setBrandId(product.getBrand().getId());
                dto.setBrandName(product.getBrand().getName());

                dto.setColorId(product.getColor().getId());
                dto.setColorValue(product.getColor().getValue());
                dto.setColorHex(product.getColor().getHexCode());

                dto.setGenderId(product.getGender().getId());
                dto.setGenderName(product.getGender().getName());

                dto.setCreatedAt(product.getCreatedAt().toString());

                dto.setImages(product.getImages());

                List<Review> reviews = session.createQuery("FROM Review r WHERE r.product.id = :pid AND r.status.value = :status",Review.class)
                        .setParameter("pid", product.getId()).setParameter("status", Status.Type.ACTIVE.name()).getResultList();

                double totalRating = 0;
                for (Review review : reviews) {
                    totalRating += review.getRating();
                }
                double averageRating = reviews.isEmpty()
                        ? 0
                        : totalRating / reviews.size();

                dto.setAverageRating(averageRating);
                dto.setTotalReviews(reviews.size());

                List<StockDTO> stockDTOList = new ArrayList<>();

                for(Stock stock : product.getStocks()){

                    StockDTO stockDTO = new StockDTO();

                    stockDTO.setStockId(stock.getId());
                    stockDTO.setPrice(stock.getPrice());
                    stockDTO.setQuantity(stock.getQuantity());

                    if (stock.getSize() != null) {
                        stockDTO.setSizeId(stock.getSize().getId());
                        stockDTO.setSizeValue(stock.getSize().getValue());
                    }

                    stockDTOList.add(stockDTO);

                    dto.setPrice(stock.getPrice());
                    dto.setQuantity(stock.getQuantity());
                }

                dto.setStockDTOList(stockDTOList);

                dtoList.add(dto);
            }

            responseObject.add("products", AppUtil.GSON.toJsonTree(dtoList));

            status = true;
            message = "Products loaded successfully!";
        }

        session.close();

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        return AppUtil.GSON.toJson(responseObject);
    }

    public String loadNewArrivals() {

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session = HibernateUtil.getSessionFactory().openSession();

        Status activeStatus = session.createQuery(
                        "FROM Status WHERE value = :value", Status.class)
                .setParameter("value", "ACTIVE")
                .uniqueResult();

        List<Product> productList = session.createQuery(
                        "FROM Product p WHERE p.status = :status ORDER BY p.createdAt DESC",
                        Product.class)
                .setParameter("status", activeStatus)
                .setMaxResults(4)
                .getResultList();

        if (productList.isEmpty()) {

            message = "No new arrival products found!";

        } else {

            List<ProductDTO> dtoList = new ArrayList<>();

            for (Product product : productList) {

                ProductDTO dto = new ProductDTO();

                dto.setId(product.getId());
                dto.setTitle(product.getTitle());
                dto.setDescription(product.getDescription());

                dto.setCategoryId(product.getCategory().getId());
                dto.setCategoryName(product.getCategory().getName());

                dto.setSubCategoryId(product.getSubcategory().getId());
                dto.setSubCategoryName(product.getSubcategory().getName());

                dto.setBrandId(product.getBrand().getId());
                dto.setBrandName(product.getBrand().getName());

                dto.setColorId(product.getColor().getId());
                dto.setColorValue(product.getColor().getValue());
                dto.setColorHex(product.getColor().getHexCode());

                dto.setGenderId(product.getGender().getId());
                dto.setGenderName(product.getGender().getName());

                dto.setCreatedAt(product.getCreatedAt().toString());

                dto.setImages(product.getImages());

                List<StockDTO> stockDTOList = new ArrayList<>();

                for (Stock stock : product.getStocks()) {

                    StockDTO stockDTO = new StockDTO();

                    stockDTO.setStockId(stock.getId());
                    stockDTO.setPrice(stock.getPrice());
                    stockDTO.setQuantity(stock.getQuantity());

                    if (stock.getSize() != null) {
                        stockDTO.setSizeId(stock.getSize().getId());
                        stockDTO.setSizeValue(stock.getSize().getValue());
                    }

                    stockDTOList.add(stockDTO);

                    dto.setPrice(stock.getPrice());
                    dto.setQuantity(stock.getQuantity());
                }

                dto.setStockDTOList(stockDTOList);

                dtoList.add(dto);
            }

            responseObject.add("products",
                    AppUtil.GSON.toJsonTree(dtoList));

            status = true;
            message = "New arrivals loaded successfully!";
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        session.close();
        return AppUtil.GSON.toJson(responseObject);
    }

    public String loadSingleProduct(int id){

        JsonObject responseObject = new JsonObject();
        boolean status = false;
        String message;

        Session session = HibernateUtil.getSessionFactory().openSession();

        Product product = session.get(Product.class, id);

        if(product == null){
            message = "No product found!";
        }else{

            ProductDTO pdto = new ProductDTO();

            pdto.setId(product.getId());
            pdto.setTitle(product.getTitle());
            pdto.setDescription(product.getDescription());

            pdto.setCategoryId(product.getCategory().getId());
            pdto.setCategoryName(product.getCategory().getName());

            pdto.setSubCategoryId(product.getSubcategory().getId());
            pdto.setSubCategoryName(product.getSubcategory().getName());

            pdto.setBrandId(product.getBrand().getId());
            pdto.setBrandName(product.getBrand().getName());

            pdto.setColorId(product.getColor().getId());
            pdto.setColorValue(product.getColor().getValue());
            pdto.setColorHex(product.getColor().getHexCode());

            pdto.setGenderId(product.getGender().getId());
            pdto.setGenderName(product.getGender().getName());

            pdto.setCreatedAt(product.getCreatedAt().toString());

            pdto.setImages(product.getImages());

            List<Review> reviews = session.createQuery("FROM Review r WHERE r.product.id = :pid AND r.status.value = :status",Review.class)
                    .setParameter("pid", product.getId()).setParameter("status", Status.Type.ACTIVE.name()).getResultList();

            double totalRating = 0;
            for (Review review : reviews) {
                totalRating += review.getRating();
            }
            double averageRating = reviews.isEmpty()
                    ? 0
                    : totalRating / reviews.size();

            pdto.setAverageRating(averageRating);
            pdto.setTotalReviews(reviews.size());

            List<StockDTO> stockDTOList = new ArrayList<>();

            for(Stock stock : product.getStocks()){

                StockDTO sdto = new StockDTO();

                sdto.setStockId(stock.getId());
                sdto.setProductId(product.getId());
                sdto.setPrice(stock.getPrice());
                sdto.setQuantity(stock.getQuantity());

                if (stock.getSize() != null) {
                    sdto.setSizeId(stock.getSize().getId());
                    sdto.setSizeValue(stock.getSize().getValue());
                }

                stockDTOList.add(sdto);

                pdto.setPrice(stock.getPrice());
                pdto.setQuantity(stock.getQuantity());
            }

            pdto.setStockDTOList(stockDTOList);

            if (product.getProductDetails() != null &&
                    !product.getProductDetails().isEmpty()) {

                Type type = new TypeToken<Map<String, Object>>() {}.getType();

                Map<String, Object> detailsMap =
                        AppUtil.GSON.fromJson(product.getProductDetails(), type);

                pdto.setProductDetails(detailsMap);
            }

            responseObject.add("productData", AppUtil.GSON.toJsonTree(pdto));

            status = true;
            message = "Product loaded successfully!";
        }

        responseObject.addProperty("status", status);
        responseObject.addProperty("message", message);

        session.close();

        return AppUtil.GSON.toJson(responseObject);
    }

}
