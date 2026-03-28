package lk.jiat.flexzone.dto;

import java.util.List;

public class StockDTO {

    private int stockId;
    private int productId;
    private double price;
    private int quantity;
    private int sizeId;
    private String sizeValue;
    private String createdAt;
    private String updatedAt;
    private String couponCode;
    private double discountValue;
    private List<DiscountDTO> discountDTOList;

    public StockDTO() {

    }

    public int getStockId() {
        return stockId;
    }

    public void setStockId(int stockId) {
        this.stockId = stockId;
    }

    public int getProductId() {
        return productId;
    }

    public void setProductId(int productId) {
        this.productId = productId;
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

    public int getSizeId() {
        return sizeId;
    }

    public void setSizeId(int sizeId) {
        this.sizeId = sizeId;
    }

    public String getSizeValue() {
        return sizeValue;
    }

    public void setSizeValue(String sizeValue) {
        this.sizeValue = sizeValue;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public String getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(String updatedAt) {
        this.updatedAt = updatedAt;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }

    public double getDiscountValue() {
        return discountValue;
    }

    public void setDiscountValue(double discountValue) {
        this.discountValue = discountValue;
    }

    public List<DiscountDTO> getDiscountDTOList() {
        return discountDTOList;
    }

    public void setDiscountDTOList(List<DiscountDTO> discountDTOList) {
        this.discountDTOList = discountDTOList;
    }
}
