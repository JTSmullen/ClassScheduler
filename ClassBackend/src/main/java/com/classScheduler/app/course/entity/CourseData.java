package com.classScheduler.app.course.entity;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

/**
 * Entity containing the list of CourseSections and the date and time from the JSON data_wolfe
 * @author George Rule
 */
@Getter
@Setter
public class CourseData {

//    Example CourseData JSON:
//    {"classes":[{},{},{}],"date":"2024-04-10","time":"02:15:01"}

    private List<CourseSection> classes;
    private String date;
    private String time;

}