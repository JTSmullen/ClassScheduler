package com.classScheduler.app.Advisor.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity

public class Advisor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "advisor_id", nullable = false)
    private Long Id;

    @Column(name = "name", length = 20, nullable = false)
    private String name;

}
