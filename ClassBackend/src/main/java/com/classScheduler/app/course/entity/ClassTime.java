package com.classScheduler.app.course.entity;

import jakarta.persistence.Embeddable;

import java.sql.Time;

@Embeddable
public class ClassTime {
    private String days;
    private Time startTime;
    private Time endTime;

    // --- GETTERS AND SETTERS ---
    public ClassTime() {}

    public String getDays() {
        return days;
    }

    public void setDays(String days) {
        this.days = days;
    }

    public Time getStartTime() {
        return startTime;
    }

    public void setStartTime(Time startTime) {
        this.startTime = startTime;
    }

    public Time getEndTime() {
        return endTime;
    }

    public void setEndTime(Time endTime) {
        this.endTime = endTime;
    }
}
