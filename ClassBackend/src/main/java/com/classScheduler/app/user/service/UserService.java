package com.classScheduler.app.user.service;

import com.classScheduler.app.schedule.dto.UserScheduleDTO;
import com.classScheduler.app.security.util.SecurityUtil;
import com.classScheduler.app.user.dto.BaseUserDTO;
import com.classScheduler.app.user.entities.User;
import com.classScheduler.app.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final SecurityUtil securityUtil;

    public UserService(UserRepository userRepository, SecurityUtil securityUtil) {
        this.userRepository = userRepository;
        this.securityUtil = securityUtil;
    }

    public BaseUserDTO loadUserInfo() {

        User detachedUser = securityUtil.getCurrentUser().orElseThrow();

        User user = userRepository.findById(detachedUser.getId()).orElseThrow();

        List<UserScheduleDTO> schedules = user.getSchedules()
                .stream()
                .map(schedule -> new UserScheduleDTO(
                        schedule.getName(),
                        schedule.getId(),
                        schedule.getLastSave()
                ))
                .toList();

        return new BaseUserDTO(
                user.getId(),
                user.getName(),
                user.getFirstName(),
                schedules
        );

    }

}
