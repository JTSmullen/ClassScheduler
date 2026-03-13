package com.classScheduler.app.search;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseSectionRepository;
import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.search.service.SearchService;
import com.classScheduler.app.security.util.SecurityUtil;
import com.classScheduler.app.user.entities.User;
import com.classScheduler.app.user.repository.UserRepository;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@SpringBootTest
@Transactional
class SearchServiceIntegrationTest {

    @Autowired
    private SearchService searchService;

    @Autowired
    private CourseSectionRepository courseSectionRepository;

    @Autowired
    private UserRepository userRepository;

    @MockBean
    private SecurityUtil securityUtil;

    private User testUser;

    @BeforeEach
    void setup() {

        // create user
        testUser = new User();
        testUser.setName("testuser");
        testUser.setPasswordHash("password");
        testUser.setFirstName("Test");
        testUser.setLastName("User");
        testUser.setEmail("test@test.com");

        userRepository.save(testUser);

        // mock authenticated user
        when(securityUtil.getCurrentUser()).thenReturn(Optional.of(testUser));

        courseSectionRepository.deleteAll();
    }

    private CourseSection createCourse(String subject, int number, String name) {

        CourseSection c = new CourseSection();
        c.setSubject(subject);
        c.setNumber(number);
        c.setName(name);
        c.setCredits(3);
        c.setFaculty(new ArrayList<>());
        c.setTimes(new ArrayList<>());

        return courseSectionRepository.save(c);
    }

    @Test
    void search_findsCourseByName() {

        createCourse("CS", 101, "Intro to Programming");

        Set<String> keywords = Set.of("Programming");

        List<SearchItemDTO> results = searchService.search(keywords);

        assertEquals(1, results.size());
        assertEquals("Intro to Programming", results.get(0).getName());
    }

    @Test
    void search_findsCourseBySubject() {

        createCourse("MATH", 201, "Calculus I");

        Set<String> keywords = Set.of("MATH");

        List<SearchItemDTO> results = searchService.search(keywords);

        assertEquals(1, results.size());
        assertEquals("MATH", results.get(0).getSubject());
    }

    @Test
    void search_returnsEmpty_whenNoMatch() {

        createCourse("CS", 101, "Intro to Programming");

        Set<String> keywords = Set.of("History");

        List<SearchItemDTO> results = searchService.search(keywords);

        assertTrue(results.isEmpty());
    }

    @Test
    void search_handlesMultipleKeywords() {

        createCourse("CS", 101, "Intro to Programming");
        createCourse("MATH", 201, "Calculus I");

        Set<String> keywords = Set.of("Programming", "Calculus");

        List<SearchItemDTO> results = searchService.search(keywords);

        assertEquals(2, results.size());
    }

    @Test
    void search_removesDuplicateResults() {

        createCourse("CS", 101, "Programming");

        Set<String> keywords = Set.of("Programming", "CS");

        List<SearchItemDTO> results = searchService.search(keywords);

        assertEquals(1, results.size());
    }
}