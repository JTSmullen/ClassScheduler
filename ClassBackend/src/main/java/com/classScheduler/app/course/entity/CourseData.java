package com.classScheduler.app.course.entity;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;

import java.util.List;


@Entity
@Getter
@Setter
public class CourseData {

    private List<CourseSection> classes;
    private String date;
    private String time;

}