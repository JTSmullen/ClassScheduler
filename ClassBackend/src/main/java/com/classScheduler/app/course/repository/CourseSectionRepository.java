package com.classScheduler.app.course.repository;

import com.classScheduler.app.course.entity.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseSectionRepository extends JpaRepository <CourseSection, Long> {
    List<CourseSection> findByNameContainingIgnoreCase(String keyword);
}