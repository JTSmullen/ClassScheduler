package com.classScheduler.app.filter.entity;

import com.classScheduler.app.filter.enums.CourseCode;
import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;
import com.classScheduler.app.filter.enums.Professor;

import java.sql.Time;

public class Filter {
    private Professor professor;
    private Time classTime;
    private Department department;
    private CourseCode courseCode;
    private CreditHours creditHours;
}
