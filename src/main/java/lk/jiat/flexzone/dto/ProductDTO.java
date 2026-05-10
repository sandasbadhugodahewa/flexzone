package lk.jiat.flexzone.dto;

import java.io.Serializable;
import java.util.List;
import java.util.Map;

public class ProductDTO implements Serializable {

    private int id;
    private String title;
    private String description;
    private int categoryId;
    private String categoryName;
    private String imagePath;
    private int subCategoryId;
    private String subCategoryName;
    private int colorId;
    private String colorValue;
    private String colorHex;
    private int brandId;
    private String brandName;
    private int genderId;
    private String genderName;
    private double price;
    private int quantity;
    private String status;
    private List<StockDTO> stockDTOList;
    private List<String> images;
    private Map<String, Object> productDetails;
    private List<String> keptImages;
    private List<String> newImages;

    public ProductDTO() {

    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public int getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(int categoryId) {
        this.categoryId = categoryId;
    }

    public String getCategoryName() {
        return categoryName;
    }

    public void setCategoryName(String categoryName) {
        this.categoryName = categoryName;
    }

    public String getImagePath() {
        return imagePath;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public int getSubCategoryId() {
        return subCategoryId;
    }

    public void setSubCategoryId(int subCategoryId) {
        this.subCategoryId = subCategoryId;
    }

    public String getSubCategoryName() {
        return subCategoryName;
    }

    public void setSubCategoryName(String subCategoryName) {
        this.subCategoryName = subCategoryName;
    }

    public int getColorId() {
        return colorId;
    }

    public void setColorId(int colorId) {
        this.colorId = colorId;
    }

    public String getColorValue() {
        return colorValue;
    }

    public void setColorValue(String colorValue) {
        this.colorValue = colorValue;
    }

    public String getColorHex() {
        return colorHex;
    }

    public void setColorHex(String colorHex) {
        this.colorHex = colorHex;
    }

    public int getBrandId() {
        return brandId;
    }

    public void setBrandId(int brandId) {
        this.brandId = brandId;
    }

    public String getBrandName() {
        return brandName;
    }

    public void setBrandName(String brandName) {
        this.brandName = brandName;
    }

    public int getGenderId() {
        return genderId;
    }

    public void setGenderId(int genderId) {
        this.genderId = genderId;
    }

    public String getGenderName() {
        return genderName;
    }

    public void setGenderName(String genderName) {
        this.genderName = genderName;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public int getQuantity() {
        return quantity;
    }

    public void setQuantity(int quantity) {
        this.quantity = quantity;
    }

    public List<StockDTO> getStockDTOList() {
        return stockDTOList;
    }

    public void setStockDTOList(List<StockDTO> stockDTOList) {
        this.stockDTOList = stockDTOList;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public Map<String, Object> getProductDetails() {
        return productDetails;
    }

    public void setProductDetails(Map<String, Object> productDetails) {
        this.productDetails = productDetails;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public List<String> getKeptImages() {
        return keptImages;
    }

    public void setKeptImages(List<String> keptImages) {
        this.keptImages = keptImages;
    }

    public List<String> getNewImages() {
        return newImages;
    }

    public void setNewImages(List<String> newImages) {
        this.newImages = newImages;
    }
}
