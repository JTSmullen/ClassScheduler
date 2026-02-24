package com.classScheduler.app.course.entity;

import com.classScheduler.app.filter.enums.Professor;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Entity
@Getter
@Setter
public class CourseSection {

    @Id
    @Column(name = "course_section_id")
    private int id;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;

    @Enumerated(EnumType.STRING)
    private Professor professor;

    @ElementCollection
    @CollectionTable(name = "section_schedule", joinColumns = @JoinColumn(name = "section_id"))
    private List<ClassTime> classTimes;

    // --- GETTERS AND SETTERS ---
    public CourseSection() {}

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    public Course getCourse() {
        return course;
    }

    public void setCourse(Course course) {
        this.course = course;
    }

    public Professor getProfessor() {
        return professor;
    }

    public void setProfessor(Professor professor) {
        this.professor = professor;
    }

    public List<ClassTime> getClassTimes() {
        return classTimes;
    }

    public void setClassTimes(List<ClassTime> classTimes) {
        this.classTimes = classTimes;
    }
}

