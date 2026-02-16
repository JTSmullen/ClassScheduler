package com.classScheduler.app.course.entity;

/**
 * @author George
 */

import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;

import jakarta.persistence.*;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
public abstract class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "course_id", nullable = false)
    protected Long CourseID;

    @Column(name = "name", length = 30, nullable = false)
    protected String name;

    @Enumerated(EnumType.STRING)
    @Column(name = "credit_hours")
    protected CreditHours creditHours;

    @Enumerated(EnumType.STRING)
    @Column(name = "department")
    protected Department department;

    @OneToMany(mappedBy = "course", fetch = FetchType.EAGER)
    private List<CourseSection> sections;

}
