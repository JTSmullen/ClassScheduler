package com.classScheduler.app.course.entity;

/**
 * Entity containing grouped together info from CourseSections
 *
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
public class Course {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String subject;
    private int number;
    private String name;
    private int credits;

    @OneToMany(mappedBy = "course", cascade = CascadeType.ALL)
    private List<CourseSection> sections;

}