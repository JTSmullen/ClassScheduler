package com.classScheduler.app.course.entity;

import com.classScheduler.app.filter.enums.Professor;
import com.classScheduler.app.schedule.entity.Schedule;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
/**
 * Entity containing course all course information from a course in data_wolfe
 *
 * @author George Rule
 */
@Entity
@Getter
@Setter
@Table(name = "course_sections")
public class CourseSection {

// Example CourseSection JSON:
//    {
//      "credits":3,
//      "faculty":["Graybill, Keith B."],
//      "is_lab":false,
//      "is_open":true,
//      "location":"SHAL 316",
//      "name":"PRINCIPLES OF ACCOUNTING I",
//      "number":201,
//      "open_seats":1,
//      "section":"A",
//      "semester":"2023_Fall",
//      "subject":"ACCT",
//      "times":[
//          {"day":"T","end_time":"16:45:00","start_time":"15:30:00"},
//          {"day":"R","end_time":"16:45:00","start_time":"15:30:00"}
//      ],
//      "total_seats":30}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "courseSection_id", nullable = false)
    private Long id;

    private String subject;        // "ACCT"
    private int number;            // 201
    private String name;           // "PRINCIPLES OF ACCOUNTING I"

    private int credits;

    @ManyToMany(mappedBy = "courseSections")
    private List<Schedule> schedules;

    @JsonProperty("is_lab")
    private boolean isLab;

    @JsonProperty("is_open")
    private boolean isOpen;

    private String location;

    private String section;        // "A"

    private String semester;

    @JsonProperty("open_seats")
    private int openSeats;

    @JsonProperty("total_seats")
    private int totalSeats;

    private List<String> faculty;

    @ElementCollection
    @CollectionTable(
            name = "section_times",
            joinColumns = @JoinColumn(name = "section_id")
    )
    @Column(name = "time_value")
    private List<String> times;

    @ManyToOne
    @JoinColumn(name = "course_id")
    private Course course;
}

