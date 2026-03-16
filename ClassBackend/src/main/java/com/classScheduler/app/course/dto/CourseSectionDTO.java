package com.classScheduler.app.course.dto;

import com.classScheduler.app.course.entity.ClassTime;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
@AllArgsConstructor
public class CourseSectionDTO {

    private Long id;
    private String subject;
    private int number;
    private String name;
    private int credits;

    @JsonProperty("is_lab") private boolean isLab;

    @JsonProperty("is_open") private boolean isOpen;

    private String location;
    private String section;
    private String semester;

    @JsonProperty("open_seats") private int openSeats;
    @JsonProperty("total_seats") private int totalSeats;

    private List<String> faculty;

    private List<ClassTime> times;

}
