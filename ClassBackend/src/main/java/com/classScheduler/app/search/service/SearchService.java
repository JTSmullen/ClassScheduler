package com.classScheduler.app.search.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.course.entity.Course;
import com.classScheduler.app.course.spec.CourseSectionSpecification;
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
import com.classScheduler.app.search.dto.SearchResponseDTO;

import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;

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

    @Transactional(readOnly = true)
    public SearchResponseDTO searchAndFilter(SearchFilterDTO filter, Pageable pageable) {
        Set<String> keywordSet = Optional.ofNullable(filter.getKeyword())
                .orElse("")
                .trim()
                .isEmpty()
                ? new HashSet<>()
                : Arrays.stream(filter.getKeyword().trim().split("\\s+"))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());

        // build specification
        Specification<CourseSection> spec = CourseSectionSpecification.build(filter, keywordSet);

        // execute query
        Page<CourseSection> resultsPage = courseSectionRepository.findAll(spec, pageable);
        Set<CourseSection> results = new HashSet<>(resultsPage.getContent());

        // build results DTO
        Set<SearchItemDTO> resultsDTO = buildSearchResultsDTO(results);

        // return search results and
        return new SearchResponseDTO(resultsDTO, resultsPage.getNumber(), resultsPage.getTotalPages(), resultsPage.getTotalElements());
    }

    // helper method to build SearchI
    private Set<SearchItemDTO> buildSearchResultsDTO(Set<CourseSection> results) {
        List<SearchItemDTO> resultsDTOList = results.stream()
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

        Set<SearchItemDTO> resultsDTO = new HashSet<>(resultsDTOList);

        return resultsDTO;
    }

    @Transactional(readOnly = true)
    public FilterOptionsDTO buildFilterOptionsDTO() {
        Set<String> semesters = courseSectionRepository.findDistinctSemesters();
        Set<String> subjects = courseSectionRepository.findDistinctSubjects();
        Set<Integer> numbers = courseSectionRepository.findDistinctNumbers();
        Set<Integer> credits = courseSectionRepository.findDistinctCredits();
        Set<String> faculty = courseSectionRepository.findDistinctFaculty();

        return new FilterOptionsDTO(semesters, subjects, numbers, credits, faculty);
    }

    @Transactional(readOnly = true)
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