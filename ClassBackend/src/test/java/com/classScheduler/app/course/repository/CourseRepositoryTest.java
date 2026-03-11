package com.classScheduler.app.course.repository;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.search.entity.Search;
import com.classScheduler.app.search.service.SearchService;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.ArrayList;
import java.util.List;
import java.util.HashSet;
import java.util.Set;

@DataJpaTest
class CourseRepositoryTest {

    @Autowired
    private CourseSectionRepository repository;

    private SearchService getSearchService() {
        return new SearchService(repository);
    }

    @Test
    void testDatabaseNameUpperQueryLower() {
        CourseSection cs = new CourseSection();
        cs.setName("Principles of Accounting");
        repository.save(cs);

        List<CourseSection> results = repository.findByNameContainingIgnoreCase("accounting");
        assertFalse(results.isEmpty());
        assertEquals("Principles of Accounting", results.get(0).getName());
    }

    @Test
    void testMultipleResultsQueryUpperDatabaseBoth() {
        CourseSection cs1 = new CourseSection();
        cs1.setName("Principles of Accounting");

        CourseSection cs2 = new CourseSection();
        cs2.setName("principles of accounting");

        repository.save(cs1);
        repository.save(cs2);

        List<CourseSection> results = repository.findByNameContainingIgnoreCase("Accounting");
        assertEquals(2, results.size());
    }

    // AI for following
    @Test
    void testMultipleKeywordsWithSearchService() {
        // Create courses
        CourseSection cs1 = new CourseSection();
        cs1.setName("Principles of Accounting");

        CourseSection cs2 = new CourseSection();
        cs2.setName("Financial Management");

        CourseSection cs3 = new CourseSection();
        cs3.setName("Introduction to Programming");

        repository.save(cs1);
        repository.save(cs2);
        repository.save(cs3);

        // Use SearchService for multiple keyword search
        SearchService searchService = getSearchService();

        Set<String> keywords = new HashSet<>();
        keywords.add("Accounting");
        keywords.add("Programming");

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        // Assertions
        assertEquals(2, results.size());
        assertTrue(results.stream().anyMatch(cs -> cs.getName().equals("Principles of Accounting")));
        assertTrue(results.stream().anyMatch(cs -> cs.getName().equals("Introduction to Programming")));
        // Ensure financial management is not in results
        assertFalse(results.stream().anyMatch(cs -> cs.getName().equals("Financial Management")));
    }

    @Test
    void testCourseMatchingMultipleKeywordsDoesNotDuplicate() {
        // Create course that matches multiple keywords
        CourseSection cs = new CourseSection();
        cs.setName("Accounting and Programming");
        repository.save(cs);

        SearchService searchService = new SearchService(repository);

        Set<String> keywords = new HashSet<>();
        keywords.add("Accounting");
        keywords.add("Programming");

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        // Should only appear once
        assertEquals(1, results.size());
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("Accounting and Programming")));
    }

    @Test
    void testEmptyKeywordSetReturnsEmptyResults() {
        // No courses needed for this test
        SearchService searchService = new SearchService(repository);
        Set<String> keywords = new HashSet<>();

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        // Expect empty result
        assertTrue(results.isEmpty());
    }

    @Test
    void testNoMatchesReturnsEmpty() {
        // Create a course that won't match keyword
        CourseSection cs = new CourseSection();
        cs.setName("Financial Management");
        repository.save(cs);

        SearchService searchService = new SearchService(repository);
        Set<String> keywords = new HashSet<>();
        keywords.add("Accounting");

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        // Should be empty because no course matches
        assertTrue(results.isEmpty());
    }

    @Test
    void testPartialKeywordMatch() {
        CourseSection cs = new CourseSection();
        cs.setName("Principles of Accounting");
        repository.save(cs);

        SearchService searchService = new SearchService(repository);
        Set<String> keywords = new HashSet<>();
        keywords.add("Acc"); // partial match

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        assertEquals(1, results.size());
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("Principles of Accounting")));
    }

    @Test
    void testMultipleCoursesWithOverlappingKeywords() {
        CourseSection cs1 = new CourseSection();
        cs1.setName("Accounting for Managers");

        CourseSection cs2 = new CourseSection();
        cs2.setName("Advanced Accounting");

        repository.save(cs1);
        repository.save(cs2);

        SearchService searchService = new SearchService(repository);
        Set<String> keywords = new HashSet<>();
        keywords.add("Accounting");

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        assertEquals(2, results.size());
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("Accounting for Managers")));
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("Advanced Accounting")));
    }

    @Test
    void testCaseInsensitiveKeywordSearch() {
        CourseSection cs1 = new CourseSection();
        cs1.setName("ACCOUNTING BASICS");

        CourseSection cs2 = new CourseSection();
        cs2.setName("Principles of accounting");

        CourseSection cs3 = new CourseSection();
        cs3.setName("Intro to AcCoUnTiNg");

        repository.save(cs1);
        repository.save(cs2);
        repository.save(cs3);

        SearchService searchService = new SearchService(repository);
        Set<String> keywords = new HashSet<>();
        keywords.add("accounting");

        Search search = searchService.search(keywords);
        List<CourseSection> results = search.getResults();

        assertEquals(3, results.size());
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("ACCOUNTING BASICS")));
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("Principles of accounting")));
        assertTrue(results.stream().anyMatch(c -> c.getName().equals("Intro to AcCoUnTiNg")));
    }

}