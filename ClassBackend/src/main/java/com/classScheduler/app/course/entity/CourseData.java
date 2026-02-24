package com.classScheduler.app.course.entity;
import java.util.List;



public class CourseData {

    private List<CourseSection> classes;
    private String date;
    private String time;

    // --- GETTERS AND SETTERS ---
    public List<CourseSection> getClasses() {
        return classes;
    }

    public void setClasses(List<CourseSection> classes) {
        this.classes = classes;
    }

    public String getDate() {
        return date;
    }

    public void setDate(String date) {
        this.date = date;
    }

    public String getTime() {
        return time;
    }

    public void setTime(String time) {
        this.time = time;
    }
}