package com.classScheduler.app.schedule.controller;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.dto.*;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.schedule.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @PostMapping("create")
    public ResponseEntity<?> createNewSchedule(@Valid @RequestBody NewScheduleRequest newScheduleRequest) {

        ScheduleDTO createdSchedule = scheduleService.newSchedule(newScheduleRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body(createdSchedule);

    }

    @PostMapping("load")
    public ResponseEntity<ScheduleDTO> loadSchedule(@Valid @RequestBody LoadScheduleRequest loadScheduleRequest) {

        ScheduleDTO schedule = scheduleService.loadSchedule(loadScheduleRequest.getId());
        return ResponseEntity.ok(schedule);

    }

    @PostMapping("add")
    public ResponseEntity<ScheduleDTO> addCourse(@Valid @RequestBody AddCourseRequest addCourseRequest) {

        ScheduleDTO updatedSchedule = scheduleService.addCourse(
                addCourseRequest.getSchedule_id(),
                addCourseRequest.getCourse_id()
        );

        return ResponseEntity.ok(updatedSchedule);
    }

    @PostMapping("remove")
    public ResponseEntity<ScheduleDTO> removeCourse(@Valid @RequestBody RemoveCourseRequest removeCourseRequest) {

        ScheduleDTO updatedSchedule = scheduleService.removeCourse(
                removeCourseRequest.getSchedule_id(),
                removeCourseRequest.getCourse_id()
        );

        return ResponseEntity.ok(updatedSchedule);
    }

}
