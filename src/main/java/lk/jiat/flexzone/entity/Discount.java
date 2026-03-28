package lk.jiat.flexzone.entity;

import jakarta.persistence.*;

import java.io.Serializable;
import java.util.Date;

@Entity
public class Discount implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(name = "coupn_code", length = 45, nullable = false, unique = true)
    private String couponCode;

    @Column(nullable = false)
    private Double value;

    @Column(name = "start_at", nullable = false)
    private Date startedAt;

    @Column(name = "expire_at", nullable = false)
    private Date expiredAt;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getCouponCode() {
        return couponCode;
    }

    public void setCouponCode(String couponCode) {
        this.couponCode = couponCode;
    }

    public Double getValue() {
        return value;
    }

    public void setValue(Double value) {
        this.value = value;
    }

    public Date getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Date startedAt) {
        this.startedAt = startedAt;
    }

    public Date getExpiredAt() {
        return expiredAt;
    }

    public void setExpiredAt(Date expiredAt) {
        this.expiredAt = expiredAt;
    }
}
