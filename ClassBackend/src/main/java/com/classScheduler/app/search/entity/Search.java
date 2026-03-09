package com.classScheduler.app.search.entity;

import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;
import com.classScheduler.app.filter.enums.CourseCode;
import com.classScheduler.app.filter.enums.Professor;
import com.classScheduler.app.course.entity.CourseSection;

import java.util.ArrayList;
import java.util.List;

public class Search {
    private Set<String> keywords;
    private ArrayList<CourseSection> results;
    private ArrayList<CourseSection> filteredResults;

    public Search(Set<String> keywords) {
        this.keywords = keywords;
        results = new ArrayList<CourseSection>();
        filteredResults = new Arraylist<CourseSection>();
    }

    public ArrayList<CourseSection> getResults(){
        return results;
    }
    public void setResultS(Arraylist<CourseSection> results) {
        this.results = results;
    }
}
