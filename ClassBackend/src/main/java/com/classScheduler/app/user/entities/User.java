package com.classScheduler.app.user.entities;

import com.classScheduler.app.Advisor.entities.Advisor;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
@Entity

public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "user_id", nullable = false)
    private Long Id;

    @Column(name = "name", length = 20, nullable = false)
    private String name;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @ManyToOne
    @JoinColumn(name = "advisor")
    private Advisor advisor;
    
}
