package lk.jiat.flexzone.dto;

import java.util.List;

public class OrderItemDTO {

    private int orderItemId;
    private int stockId;
    private String productTitle;
    private int qty;
    private double price;
    private String sizeValue;
    private List<String> images;
    private boolean reviewed;
    private ReviewDTO review;

    public OrderItemDTO() {

    }

    public int getOrderItemId() {
        return orderItemId;
    }

    public void setOrderItemId(int orderItemId) {
        this.orderItemId = orderItemId;
    }

    public int getStockId() {
        return stockId;
    }

    public void setStockId(int stockId) {
        this.stockId = stockId;
    }

    public String getProductTitle() {
        return productTitle;
    }

    public void setProductTitle(String productTitle) {
        this.productTitle = productTitle;
    }

    public int getQty() {
        return qty;
    }

    public void setQty(int qty) {
        this.qty = qty;
    }

    public double getPrice() {
        return price;
    }

    public void setPrice(double price) {
        this.price = price;
    }

    public String getSizeValue() {
        return sizeValue;
    }

    public void setSizeValue(String sizeValue) {
        this.sizeValue = sizeValue;
    }

    public List<String> getImages() {
        return images;
    }

    public void setImages(List<String> images) {
        this.images = images;
    }

    public boolean isReviewed() {
        return reviewed;
    }

    public void setReviewed(boolean reviewed) {
        this.reviewed = reviewed;
    }


    public ReviewDTO getReview() {
        return review;
    }

    public void setReview(ReviewDTO review) {
        this.review = review;
    }

}
