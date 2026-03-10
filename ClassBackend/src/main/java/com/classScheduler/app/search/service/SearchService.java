package com.classScheduler.app.search.service;

import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;
import com.classScheduler.app.filter.enums.CourseCode;
import com.classScheduler.app.filter.enums.Professor;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseRepository;
import com.classScheduler.app.search.entity.Search;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {
    private final CourseRepository repository;
    public SearchService(CourseRepository repository) {
        this.repository = repository;
    }

    public Search search(Set<String> keywords) {
        Search search = new Search(keywords);
        Set<CourseSection> results = new HashSet<>();
        for (String keyword : keywords) {
            results.addAll(repository.findByNameContainingIgnoreCase(keyword));
        }
        search.setResults(new ArrayList<>(results));
        return search;
    }
}