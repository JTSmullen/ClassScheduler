package com.classScheduler.app.schedule.dto;


import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.user.dto.UserDTO;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class ScheduleDTO {

    private Long id;
    private String name;

    private List<CourseSectionDTO> courseSections;

    private UserDTO user;

    private boolean hasConflict;

}
