package com.classScheduler.app.course.repository;


import com.classScheduler.app.course.entity.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {

    @Query("SELECT c FROM CourseSection c " +
            "WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(c.subject) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<CourseSection> searchByKeyword(@Param("keyword") String keyword);

    List<CourseSection> findBySubjectIgnoreCaseAndNumber(String subject, int number);

    List<CourseSection> findBySubjectIgnoreCaseAndNumberAndSemester(String subject, int number, String semester);

    @Query("SELECT DISTINCT c.semester FROM CourseSection c WHERE c.semester IS NOT NULL ORDER BY c.semester")
    List<String> findDistinctSemesters();
}