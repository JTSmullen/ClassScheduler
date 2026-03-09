package com.classScheduler.app.user.dto;

import com.classScheduler.app.schedule.dto.UserScheduleDTO;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Getter
@Setter
@AllArgsConstructor
public class BaseUserDTO {

    private Long id;
    private String name;
    private String firstName;

    private List<UserScheduleDTO> schedules;

}
