package com.classScheduler.app.schedule.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RemoveCourseRequest {
    private Long schedule_id;
    private Long course_id;
}
