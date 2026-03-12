package com.classScheduler.app.schedule.dto;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.entity.Schedule;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AddCourseRequest {
    private Long schedule_id;
    private Long course_id;
}
