package com.classScheduler.app.program.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;

import lombok.Getter;
import lombok.Setter;

@Entity
@Getter
@Setter
public class ProgramSheet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String programCode;

    @Column(nullable = false)
    private String institutionName;

    @Column(nullable = false)
    private String programTitle;

    private String degreeName;

    private int entryYear;

    private String revisedDate;

    private int totalHoursRequired;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String programDataJson;
}