package com.classScheduler.app.search.entity;

import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;
import com.classScheduler.app.filter.enums.CourseCode;
import com.classScheduler.app.filter.enums.Professor;
import com.classScheduler.app.course.entity.CourseSection;

import java.util.ArrayList;
import java.util.List;

public class Search {
    private ArrayList<CourseSection> results;
    private ArrayList<CourseSection> filteredResults;

    public Search(ArrayList<CourseSection> results) {
        this.results = results;
        // no filters applied yet
        this.filteredResults = new ArrayList<>(results);
    }
}
