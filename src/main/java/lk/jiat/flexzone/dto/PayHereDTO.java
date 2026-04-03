package lk.jiat.flexzone.dto;

public class PayHereDTO {
    private String merchant_id;
    private String return_url;
    private String cancel_url;
    private String notify_url;
    private String first_name;
    private String last_name;
    private String email;
    private String phone;
    private String address;
    private String city;
    private String country;
    private String order_id;
    private String items;
    private String currency;
    private String amount;
    private String hash;
    private boolean sandbox;

    public String getMerchant_id() {
        return merchant_id;
    }

    public void setMerchant_id(String v) {
        this.merchant_id = v;
    }

    public String getReturn_url() {
        return return_url;
    }

    public void setReturn_url(String v) {
        this.return_url = v;
    }

    public String getCancel_url() {
        return cancel_url;
    }

    public void setCancel_url(String v) {
        this.cancel_url = v;
    }

    public String getNotify_url() {
        return notify_url;
    }

    public void setNotify_url(String v) {
        this.notify_url = v;
    }

    public String getFirst_name() {
        return first_name;
    }

    public void setFirst_name(String v) {
        this.first_name = v;
    }

    public String getLast_name() {
        return last_name;
    }

    public void setLast_name(String v) {
        this.last_name = v;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String v) {
        this.email = v;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String v) {
        this.phone = v;
    }

    public String getAddress() {
        return address;
    }

    public void setAddress(String v) {
        this.address = v;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String v) {
        this.city = v;
    }

    public String getCountry() {
        return country;
    }

    public void setCountry(String v) {
        this.country = v;
    }

    public String getOrder_id() {
        return order_id;
    }

    public void setOrder_id(String v) {
        this.order_id = v;
    }

    public String getItems() {
        return items;
    }

    public void setItems(String v) {
        this.items = v;
    }

    public String getCurrency() {
        return currency;
    }

    public void setCurrency(String v) {
        this.currency = v;
    }

    public String getAmount() {
        return amount;
    }

    public void setAmount(String v) {
        this.amount = v;
    }

    public String getHash() {
        return hash;
    }

    public void setHash(String v) {
        this.hash = v;
    }

    public boolean isSandbox() {
        return sandbox;
    }

    public void setSandbox(boolean v) {
        this.sandbox = v;
    }
}