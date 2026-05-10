package lk.jiat.flexzone.entity;

import jakarta.persistence.*;

import java.io.Serializable;

@Entity
@Table(name = "delivery_status")
@NamedQuery(name = "DeliveryStatus.findByValue",
        query = "FROM DeliveryStatus d WHERE d.status = :value")
public class DeliveryStatus implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int id;

    @Column(length = 45, nullable = false, unique = true)
    private String status;

    public enum Type {
        APPROVED,
        PACKING,
        SHIPPED,
        DELIVERED,
        COMPLETED,
        CANCELED
    }

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }
}
