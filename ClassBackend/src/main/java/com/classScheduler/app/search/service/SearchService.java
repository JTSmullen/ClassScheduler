package com.classScheduler.app.search.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.filter.enums.CreditHours;
import com.classScheduler.app.filter.enums.Department;
import com.classScheduler.app.filter.enums.CourseCode;
import com.classScheduler.app.filter.enums.Professor;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseSectionRepository;
import com.classScheduler.app.search.entity.Search;
import com.classScheduler.app.security.util.SecurityUtil;
import com.classScheduler.app.user.entities.User;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {
    private final CourseSectionRepository repository;
    private final SecurityUtil securityUtil;
    public SearchService(CourseSectionRepository repository, SecurityUtil securityUtil) {

        this.repository = repository;
        this.securityUtil = securityUtil;
    }

    public List<SearchItemDTO> search(Set<String> keywords) {
        User user = securityUtil.getCurrentUser().orElseThrow();
        //TODO:  delete old search in database
        Search search = new Search(keywords);

        Set<CourseSection> results = new HashSet<>();
        for (String keyword : keywords) {
            results.addAll(repository.findByNameContainingIgnoreCase(keyword));
        }
        search.setResults(new ArrayList<>(results));

        List<SearchItemDTO> resultsDTO = results.stream()
                .map(result -> new SearchItemDTO(
                        result.getSubject(),
                        result.getNumber(),
                        result.getName(),
                        result.getCredits(),
                        result.getId(),
                        result.getTimes()
                ))
                .toList();

        return resultsDTO;
    }
}