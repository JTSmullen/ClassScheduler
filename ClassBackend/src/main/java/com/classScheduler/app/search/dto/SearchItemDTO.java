package com.classScheduler.app.search.dto;


import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.user.dto.UserDTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class SearchItemDTO {
    private String subject;
    private int number;
    private String section;
    private String name;
    private int credits;
    private Long id;
    private List<ClassTime> times;
    private List<String> faculty;
}