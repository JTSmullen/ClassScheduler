package com.classScheduler.app.course.entity;

import jakarta.persistence.Embeddable;

import java.sql.Time;

@Embeddable
public class ClassTime {
    private String days;
    private Time startTime;
    private Time endTime;
}
