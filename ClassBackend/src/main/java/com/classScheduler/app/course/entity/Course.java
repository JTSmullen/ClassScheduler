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

    // --- GETTERS AND SETTERS ---
    public Course() {}

    public Long getCourseID() {
        return CourseID;
    }

    public void setCourseID(Long courseID) {
        CourseID = courseID;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public CreditHours getCreditHours() {
        return creditHours;
    }

    public void setCreditHours(CreditHours creditHours) {
        this.creditHours = creditHours;
    }

    public Department getDepartment() {
        return department;
    }

    public void setDepartment(Department department) {
        this.department = department;
    }

    public List<CourseSection> getSections() {
        return sections;
    }

    public void setSections(List<CourseSection> sections) {
        this.sections = sections;
    }
}
