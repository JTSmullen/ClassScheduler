package com.classScheduler.app.search.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.course.entity.Course;
import com.classScheduler.app.schedule.dto.ScheduleDTO;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.search.dto.FilterOptionsDTO;
import com.classScheduler.app.search.dto.SearchFilterDTO;
import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.course.dto.CourseSectionDTO;
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
import java.util.stream.Collectors;

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

    public List<SearchItemDTO> filterResults(SearchFilterDTO filter) {
        //Get current user and get their corresponding search object
        User user = securityUtil.getCurrentUser().orElseThrow();
        Search search = user.getSearch();

        if (search == null) {
            throw new IllegalStateException("User has no active search");
        }

        // filter user's search results by filter
        List<CourseSection> filtered = search.getResults().stream()
                .filter(c -> filter.getDepartment() == null || filter.getDepartment().isEmpty()
                        || filter.getDepartment().contains(c.getSubject()))
                .filter(c -> filter.getCredits() == null || filter.getCredits().isEmpty()
                        || filter.getCredits().contains(c.getCredits()))
                .filter(c -> filter.getCourseNumber() == null || filter.getCourseNumber().isEmpty()
                        || filter.getCourseNumber().contains(c.getNumber()))
                .filter(c -> filter.getProfessor() == null || filter.getProfessor().isEmpty()
                        || c.getFaculty().stream().anyMatch(filter.getProfessor()::contains))
                .toList();

        return filtered.stream()
                .map(c -> new SearchItemDTO(
                        c.getSubject(),
                        c.getNumber(),
                        c.getName(),
                        c.getCredits(),
                        c.getId(),
                        c.getTimes(),
                        c.getFaculty()))
                .toList();
    }

    public FilterOptionsDTO getFilterOptions() {

        User user = securityUtil.getCurrentUser().orElseThrow();
        Search search = user.getSearch();

        Set<String> departments = search.getResults().stream()
                .map(CourseSection::getSubject)
                .collect(Collectors.toSet());

        Set<Integer> credits = search.getResults().stream()
                .map(CourseSection::getCredits)
                .collect(Collectors.toSet());

        Set<String> faculty = search.getResults().stream()
                .flatMap(c -> c.getFaculty().stream())
                .collect(Collectors.toSet());

        Set<Integer> courseNumbers = search.getResults().stream()
                .map(CourseSection::getNumber)
                .collect(Collectors.toSet());

        return new FilterOptionsDTO(departments, credits, faculty, courseNumbers);
    }
}