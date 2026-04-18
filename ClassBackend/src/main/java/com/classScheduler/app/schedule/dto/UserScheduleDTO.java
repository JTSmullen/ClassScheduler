package com.classScheduler.app.schedule.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.sql.Time;
import java.time.LocalTime;

@Getter
@Setter
@AllArgsConstructor
public class UserScheduleDTO {

    private String name;
    private Long id;
    private Time lastEdited;

}
