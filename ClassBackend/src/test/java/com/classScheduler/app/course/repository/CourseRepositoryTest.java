package com.classScheduler.app.course.repository;

import com.classScheduler.app.course.entity.CourseSection;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@DataJpaTest
class CourseRepositoryTest {

    @Autowired
    private CourseRepository repository;

    @Test
    void testKeywordSearch() {

        CourseSection cs = new CourseSection();
        cs.setName("Principles of Accounting");

        repository.save(cs);

        List<CourseSection> results =
                repository.findByNameContainingIgnoreCase("accounting");

        assertFalse(results.isEmpty());
    }
}