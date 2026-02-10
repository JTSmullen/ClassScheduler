package com.classScheduler.app.schedule.entity;


import com.classScheduler.app.course.entity.CourseSection;
//import com.classScheduler.app.user.entities.User;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.sql.Time;
import java.util.List;

@Entity
@Setter
@Getter
public class Schedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "schedule_id", nullable = false)
    private Long Id;

    @Column(name = "name", length = 20, nullable = false)
    private String name;

    @OneToMany(mappedBy = "course", fetch = FetchType.EAGER)
    private List<CourseSection> courses;

//    private User user;

    private boolean hasConflict;

    private Time lastSave;
}
