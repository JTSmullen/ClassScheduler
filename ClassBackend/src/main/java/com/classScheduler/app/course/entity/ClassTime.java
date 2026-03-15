package com.classScheduler.app.course.entity;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

import java.sql.Time;
import java.time.LocalTime;

/**
 * Entity containing info for a Course Sections time
 *
 * @author George Rule
 */
@Getter
@Setter
@Embeddable
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class ClassTime {

    // Example times:
    //{"day":"T","end_time":"16:45:00","start_time":"15:30:00"}
    //{"day":"R","end_time":"16:45:00","start_time":"15:30:00"}

    @Column(name = "class_day")
    @EqualsAndHashCode.Include
    private String day;

    @JsonProperty("start_time")
    @EqualsAndHashCode.Include
    private LocalTime startTime;

    @JsonProperty("end_time")
    @EqualsAndHashCode.Include
    private LocalTime endTime;

}
