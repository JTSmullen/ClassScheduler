package com.classScheduler.app.course.entity;

import com.fasterxml.jackson.annotation.JsonProperty;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/**
 * Entity containing info for a Course Sections time
 *
 * @author George Rule
 */
@Entity
@Getter
@Setter
public class ClassTime {

    // Example times:
    //{"day":"T","end_time":"16:45:00","start_time":"15:30:00"}
    //{"day":"R","end_time":"16:45:00","start_time":"15:30:00"}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String day;

    @JsonProperty("start_time")
    private String startTime;

    @JsonProperty("end_time")
    private String endTime;

}
