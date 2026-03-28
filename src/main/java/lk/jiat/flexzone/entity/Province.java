package lk.jiat.flexzone.entity;

import jakarta.persistence.*;

import java.io.Serializable;

@Entity
public class Province implements Serializable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private int pid;

    @Column(name = "provinces", length = 60, nullable = false)
    private String provinces;

    public int getPid() {
        return pid;
    }

    public void setPid(int pid) {
        this.pid = pid;
    }

    public String getProvinces() {
        return provinces;
    }

    public void setProvinces(String provinces) {
        this.provinces = provinces;
    }
}
