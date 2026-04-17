package com.classScheduler.app.search.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.course.entity.Course;
import com.classScheduler.app.exception.customs.CourseSectionNotFoundException;
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
import com.classScheduler.app.search.repository.SearchRepository;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class SearchService {
    private final UserRepository userRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final SecurityUtil securityUtil;
    private final SearchRepository searchRepository;

    public SearchService(CourseSectionRepository courseSectionRepository, SecurityUtil securityUtil, UserRepository userRepository, SearchRepository searchRepository) {
        this.courseSectionRepository = courseSectionRepository;
        this.securityUtil = securityUtil;
        this.userRepository = userRepository;
        this.searchRepository = searchRepository;
    }

    @Transactional
    public List<SearchItemDTO> searchAndFilter(SearchFilterDTO filter) {
        // get current user that we have cached and then findById to get current User entity in case changes made since cached.
        User cachedUser = securityUtil.getCurrentUser().orElseThrow();
        User user = userRepository.findById(cachedUser.getId()).orElseThrow();


        // user has no active search
        if (user.getSearch() == null) {
            Search search = new Search();
            user.setSearch(search);
            search.setUser(user);
            // Apply filters to all results when no keyword is provided
            if (filter.getKeywords().isEmpty()) {
                Set<CourseSection> results = new HashSet<>(courseSectionRepository.findAll());
                Set<CourseSection> uniqueResults = uniqueResults(results);
                Set<CourseSection> filteredResults = applyFilter(uniqueResults, filter);
                search.setResults(uniqueResults);
                search.setKeywords(filter.getKeywords());
                searchRepository.save(search);
                userRepository.save(user);
                return buildSearchResultsDTO(filteredResults);
            }
            else {
                Set<CourseSection> results = new HashSet<>();
                // get resulting classes for keywords
                for (String keyword : filter.getKeywords()) {
                    results.addAll(courseSectionRepository.searchByKeyword(keyword));
                }
                Set<CourseSection> uniqueResults = uniqueResults(results);
                Set<CourseSection> filteredResults = applyFilter(uniqueResults, filter);
                search.setResults(uniqueResults);
                search.setKeywords(filter.getKeywords());
                searchRepository.save(search);
                userRepository.save(user);
                return buildSearchResultsDTO(filteredResults);
            }
        }
        // user already has an active search
        else {
            Search oldSearch = user.getSearch();
            // ensure that no extra database call is made if the keyword has not changed
            if (Objects.equals(oldSearch.getKeywords(), filter.getKeywords())) {
                Search search = user.getSearch();
                Set<CourseSection> results = search.getResults();
                Set<CourseSection> filteredResults = applyFilter(results, filter);
                // Results stay the same so no need to save them to the search
                search.setKeywords(filter.getKeywords());
                searchRepository.save(search);
                userRepository.save(user);
                return buildSearchResultsDTO(filteredResults);
            }
            else {
                // explicitly delete the old search before creating the new one
                user.setSearch(null);
                // delete User's current Search with hibernate and use flush to force immediate removal
                searchRepository.delete(oldSearch);
                searchRepository.flush();

                // create new Search entity
                Search search = new Search();

                // set search and save to db
                user.setSearch(search);
                search.setUser(user);

                Set<CourseSection> results = new HashSet<>();
                // get resulting classes for keywords
                for (String keyword : filter.getKeywords()) {
                    results.addAll(courseSectionRepository.searchByKeyword(keyword));
                }
                Set<CourseSection> uniqueResults = uniqueResults(results);
                Set<CourseSection> filteredResults = applyFilter(uniqueResults, filter);
                search.setResults(uniqueResults);
                search.setKeywords(filter.getKeywords());
                searchRepository.save(search);
                userRepository.save(user);
                return buildSearchResultsDTO(filteredResults);
            }
        }

    }

    // Helper method to apply filter to broader search results
    public Set<CourseSection> applyFilter(Set<CourseSection> results, SearchFilterDTO filter) {
        // filter user's search results by filter
        List<CourseSection> filtered = results.stream()
                .filter(c -> filter.getSubjects() == null || filter.getSubjects().isEmpty()
                        || filter.getSubjects().stream().anyMatch(sub -> sub.equalsIgnoreCase(c.getSubject())))
                .filter(c -> filter.getCredits() == null || filter.getCredits().isEmpty()
                        || filter.getCredits().contains(c.getCredits()))
                .filter(c -> filter.getNumbers() == null || filter.getNumbers().isEmpty()
                        || filter.getNumbers().contains(c.getNumber()))
                .filter(c -> filter.getFaculty() == null || filter.getFaculty().isEmpty()
                        || (c.getFaculty() != null && c.getFaculty().stream().anyMatch(filter.getFaculty()::contains)))
                .filter(course -> {
                    // If no time filter, accept all courses
                    if (filter.getTimes() == null || filter.getTimes().isEmpty()) return true;
                    for (List<ClassTime> requestedRange : filter.getTimes()) {
                        boolean allMatched = requestedRange.stream().allMatch(reqTime ->
                                course.getTimes().stream().anyMatch(classTime ->
                                        classTime.getDay().equals(reqTime.getDay()) &&
                                                classTime.getStartTime().compareTo(reqTime.getStartTime()) >= 0 &&
                                                classTime.getEndTime().compareTo(reqTime.getEndTime()) <= 0
                                )
                        );
                        if (allMatched) return true;
                    }
                    return false;
                })
                .toList();
        Set<CourseSection> filteredSet = new HashSet<>(filtered);
        return filteredSet;
    }

    // helper method to build SearchI
    public List<SearchItemDTO> buildSearchResultsDTO(Set<CourseSection> results) {
        List<SearchItemDTO> resultsDTO = results.stream()
                .map(result -> new SearchItemDTO(
                        result.getSubject(),
                        result.getNumber(),
                        result.getSection(),
                        result.getName(),
                        result.getCredits(),
                        result.getId(),
                        result.getTimes(),
                        result.getFaculty()
                ))
                .toList();

        return resultsDTO;
    }

    // Helper method to remove duplicate results included in db
    public Set<CourseSection> uniqueResults(Set<CourseSection> results) {
        // explicitly remove duplicate course sections since it seems like there are some duplicates in db
        Set<CourseSection> uniqueResults = new HashSet<>(results.stream()
                .collect(Collectors.toMap(
                        c -> c.getSubject() + "-" + c.getNumber() + "-" + c.getSection(),
                        c -> c,
                        (existing, replacement) -> existing // If duplicate found, just keep the first one
                ))
                .values());
        return uniqueResults;
    }




    @Transactional(readOnly = true)
    public FilterOptionsDTO getFilterOptions() {
        User cachedUser = securityUtil.getCurrentUser().orElseThrow();
        User user = userRepository.findById(cachedUser.getId()).orElseThrow();

        Search search = user.getSearch();

        if (search == null) {
            throw new IllegalStateException("User has no active search");
        }

        Set<String> subjects = search.getResults().stream()
                .map(CourseSection::getSubject)
                .collect(Collectors.toSet());

        Set<Integer> numbers = search.getResults().stream()
                .map(CourseSection::getNumber)
                .collect(Collectors.toSet());

        Set<Integer> credits = search.getResults().stream()
                .map(CourseSection::getCredits)
                .collect(Collectors.toSet());

        Set<String> faculty = search.getResults().stream()
                .flatMap(c -> c.getFaculty().stream())
                .collect(Collectors.toSet());

        Set<List<ClassTime>> times = search.getResults().stream()
                .map(CourseSection::getTimes)
                .collect(Collectors.toSet());

        return new FilterOptionsDTO(subjects, numbers, credits, faculty, times);
    }


    @Transactional
    public CourseSectionDTO getCourseDetails(Long id) {
        CourseSection section = courseSectionRepository.findById(id)
                .orElseThrow(() -> new CourseSectionNotFoundException("Section not found"));
        return new CourseSectionDTO(
                section.getId(),
                section.getSubject(),
                section.getNumber(),
                section.getName(),
                section.getCredits(),
                section.isLab(),
                section.isOpen(),
                section.getLocation(),
                section.getSection(),
                section.getSemester(),
                section.getOpenSeats(),
                section.getTotalSeats(),
                section.getFaculty(),
                section.getTimes()
        );
    }
}