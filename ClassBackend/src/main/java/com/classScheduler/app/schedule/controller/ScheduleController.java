package com.classScheduler.app.schedule.controller;

import com.classScheduler.app.schedule.dto.NewScheduleRequest;
import com.classScheduler.app.schedule.service.ScheduleService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/schedule")
public class ScheduleController {

    private final ScheduleService scheduleService;

    public ScheduleController(ScheduleService scheduleService) {
        this.scheduleService = scheduleService;
    }

    @PostMapping("create")
    public ResponseEntity<?> createNewSchedule(@Valid @RequestBody NewScheduleRequest newScheduleRequest) {

        scheduleService.newSchedule(newScheduleRequest);
        return ResponseEntity.status(HttpStatus.CREATED).body("Schedule Created");

    }

}
