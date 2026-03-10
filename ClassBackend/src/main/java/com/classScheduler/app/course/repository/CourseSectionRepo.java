package com.classScheduler.app.course.repository;

import com.classScheduler.app.course.entity.Course;
import com.classScheduler.app.course.entity.CourseSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CourseSectionRepo extends JpaRepository<CourseSection, Long> {

}
