package com.classScheduler.app.course.repository;


import com.classScheduler.app.course.entity.CourseSection;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface CourseSectionRepository extends JpaRepository<CourseSection, Long> {

    @Query("SELECT DISTINCT c FROM CourseSection c " +
            "WHERE LOWER(c.name) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR LOWER(c.subject) LIKE LOWER(CONCAT('%', :keyword, '%')) " +
            "OR STR(c.number) LIKE CONCAT('%', :keyword, '%') " +
            "OR EXISTS (SELECT f FROM c.faculty f WHERE LOWER(f) LIKE LOWER(CONCAT('%', :keyword, '%')))")
    List<CourseSection> searchByKeyword(@Param("keyword") String keyword);

}