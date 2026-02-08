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
    private int id;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;

    @Enumerated(EnumType.STRING)
    private Professor professor;

    @ElementCollection
    @CollectionTable(name = "section_schedule", joinColumns = @JoinColumn(name = "section_id"))
    private List<ClassTime> classTimes;

}

