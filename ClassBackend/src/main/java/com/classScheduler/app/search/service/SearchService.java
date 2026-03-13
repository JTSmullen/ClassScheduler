package com.classScheduler.app.search.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.schedule.dto.ScheduleDTO;
import com.classScheduler.app.schedule.entity.Schedule;
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
import com.classScheduler.app.user.repository.UserRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.HashSet;
import java.util.ArrayList;
import java.util.List;

@Service
public class SearchService {
    private final UserRepository userRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final SecurityUtil securityUtil;

    public SearchService(CourseSectionRepository courseSectionRepository, SecurityUtil securityUtil, UserRepository userRepository) {
        this.userRepository = userRepository;
        this.courseSectionRepository = courseSectionRepository;
        this.securityUtil = securityUtil;
    }

    @Transactional
    public List<SearchItemDTO> search(Set<String> keywords) {
        // get current user
        User user = securityUtil.getCurrentUser().orElseThrow();
        // deletes old search entity from database since orphan removal enabled in User
        user.setSearch(null);

        // make new search entity
        Search search = new Search();

        // associate user with search and search with user
        user.setSearch(search);
        search.setUser(user);

        // save results in Set to avoid duplicates
        Set<CourseSection> results = new HashSet<>();
        // get resulting classes for keywords
        for (String keyword : keywords) {
            results.addAll(courseSectionRepository.searchByKeyword(keyword));
        }
        // make arraylist from set with no duplicates
        search.setResults(new ArrayList<>(results));

        // make SearchItemDTO. Less items to avoid sending too much data to frontend. Will be able to look at individual classes to get more info. Will be done by getting from database entry.
        List<SearchItemDTO> resultsDTO = results.stream()
                .map(result -> new SearchItemDTO(
                        result.getSubject(),
                        result.getNumber(),
                        result.getName(),
                        result.getCredits(),
                        result.getId(),
                        result.getTimes(),
                        result.getFaculty()
                ))
                .toList();

        // Since we have cascade = CascadeType.ALL and  orphanRemoval = true in user, this will cascade all changes to Search entity
        userRepository.save(user);

        return resultsDTO;
    }
}