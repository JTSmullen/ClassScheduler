package com.classScheduler.app.course.entity;

import com.classScheduler.app.filter.enums.Professor;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
public class CourseSection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String subject;        // "ACCT"
    private int number;            // 201
    private String name;           // "PRINCIPLES OF ACCOUNTING I"

    private int credits;

    @JsonProperty("is_lab")
    private boolean isLab;

    @JsonProperty("is_open")
    private boolean isOpen;

    private String location;

    private String section;        // "A"

    private String semester;

    @JsonProperty("open_seats")
    private int openSeats;

    @JsonProperty("total_seats")
    private int totalSeats;

    private List<String> faculty;

    @OneToMany(cascade = CascadeType.ALL)
    @JoinColumn(name = "section_id")
    private List<ClassTime> times;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;
}

