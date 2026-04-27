package com.classScheduler.app.course.repository;


import com.classScheduler.app.course.entity.CourseSection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.List;
import java.util.Set;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, Long>, JpaSpecificationExecutor<CourseSection> {
    @Query("SELECT DISTINCT c.semester FROM CourseSection c")
    Set<String> findDistinctSemesters();

    @Query("SELECT DISTINCT c.subject FROM CourseSection c")
    Set<String> findDistinctSubjects();

    @Query("SELECT DISTINCT c.number FROM CourseSection c")
    Set<Integer> findDistinctNumbers();

    @Query("SELECT DISTINCT c.credits FROM CourseSection c")
    Set<Integer> findDistinctCredits();

    @Query(value = "SELECT DISTINCT faculty FROM course_faculty WHERE faculty IS NOT NULL AND TRIM(faculty) != ''", nativeQuery = true)
    Set<String> findDistinctFaculty();

    List<CourseSection> findBySubjectIgnoreCaseAndNumber(String subject, int number);

    List<CourseSection> findBySubjectIgnoreCaseAndNumberAndSemester(String subject, int number, String semester);
}