package com.classScheduler.app.search.entity;

import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;
import com.classScheduler.app.filter.enums.CourseCode;
import com.classScheduler.app.filter.enums.Professor;
import com.classScheduler.app.course.entity.Course;

import java.util.ArrayList;

public class Search {
    protected Course results;
    protected Course filteredResults;

    public Search(ArrayList<Course> results) {
        this.results = results;
        // no filters applied yet
        this.filteredResults = new ArrayList<>(results);
    }
}
