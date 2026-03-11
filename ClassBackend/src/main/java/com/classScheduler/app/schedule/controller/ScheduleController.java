package com.classScheduler.app.schedule.controller;

import com.classScheduler.app.schedule.dto.*;
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

    @GetMapping("load/{id}")
    public ResponseEntity<ScheduleDTO> loadSchedule(@PathVariable Long id) {

        ScheduleDTO schedule = scheduleService.loadSchedule(id);
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

    @DeleteMapping("delete/{id}")
    public ResponseEntity<?> deleteSchedule(@PathVariable Long id){

        scheduleService.deleteSchedule(id);

        return ResponseEntity.noContent().build();

    }

}
