package com.classScheduler.app.course.entity;

import lombok.Getter;
import lombok.Setter;

import java.sql.Time;
import java.util.ArrayList;

@Getter
@Setter
public abstract class Course {

    protected int CourseID;
    protected String name;
    protected ArrayList<String> days;
    protected Time startTime;
    protected Time endTime;

    protected CreditHours creditHours;
    protected Professor professor;
    protected Department department;

}
