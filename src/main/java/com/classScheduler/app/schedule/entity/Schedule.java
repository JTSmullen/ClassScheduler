package com.classScheduler.app.schedule.entity;

import com.classScheduler.app.course.entity.CourseSection;

import java.sql.Time;
import java.util.ArrayList;

public class Schedule {

    private ArrayList<CourseSection> classes;

    private ArrayList<String> days;
    private ArrayList<Time> timeSlots;

    public void addCourse(int courseCode){}
    public void removeCourse(int courseCode){}
    public void checkConflict(int courseCode){}

}
