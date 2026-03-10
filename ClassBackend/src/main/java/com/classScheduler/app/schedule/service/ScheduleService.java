package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseRepository;
import com.classScheduler.app.course.repository.CourseSectionRepo;
import com.classScheduler.app.schedule.dto.NewScheduleRequest;
import com.classScheduler.app.schedule.dto.ScheduleDTO;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.schedule.repository.ScheduleRepository;
import com.classScheduler.app.security.service.CustomUserDetailsService;
import com.classScheduler.app.security.util.JwtUtil;
import com.classScheduler.app.security.util.SecurityUtil;
import com.classScheduler.app.user.dto.UserDTO;

import com.classScheduler.app.user.entities.User;
import com.classScheduler.app.user.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;


import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepo;
    private final CourseRepository courseRepo;
    private final SecurityUtil securityUtil;
    private final UserRepository userRepository;
    private final CourseSectionRepo courseSectionRepo;

    public ScheduleService(ScheduleRepository scheduleRepo, CourseRepository courseRepo, SecurityUtil securityUtil, UserRepository userRepository, CourseSectionRepo courseSectionRepo) {

        this.scheduleRepo = scheduleRepo;
        this.courseRepo = courseRepo;
        this.securityUtil = securityUtil;
        this.userRepository = userRepository;
        this.courseSectionRepo = courseSectionRepo;


    }

    @Transactional
    public ScheduleDTO addCourse(Long scheduleId, Long sectionId) {
        // 1. Fetch the Schedule
        User currentUser = securityUtil.getCurrentUser().orElseThrow();
        Schedule schedule = scheduleRepo.findByIdAndUser(scheduleId, currentUser)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        // 2. Fetch the Section
        CourseSection section = courseSectionRepo.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        // 3. Add the section to the list
        schedule.getCourseSections().add(section);

        // 4. Save the changes
        scheduleRepo.save(schedule);

        // 5. Return the updated DTO so the frontend sees the change
        return loadSchedule(schedule.getId());
    }

    @Transactional
    public ScheduleDTO removeCourse(Long scheduleId, Long sectionId) {
        // 1. Fetch the Schedule
        User currentUser = securityUtil.getCurrentUser().orElseThrow();
        Schedule schedule = scheduleRepo.findByIdAndUser(scheduleId, currentUser)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        // 2. Fetch the Section
        CourseSection section = courseSectionRepo.findById(sectionId)
                .orElseThrow(() -> new RuntimeException("Section not found"));

        // 3. Remove the section from the list
        schedule.getCourseSections().remove(section);

        // 4. Save the changes
        scheduleRepo.save(schedule);

        // 5. Return the updated DTO so the frontend sees the change
        return loadSchedule(schedule.getId());
    }

    @Transactional
    public ScheduleDTO newSchedule(NewScheduleRequest newScheduleRequest) {
        Long userId = securityUtil.getCurrentUser().orElseThrow().getId();
        User user = userRepository.findById(userId).orElseThrow();

        Schedule schedule = new Schedule();
        schedule.setName(newScheduleRequest.getName());
        schedule.setUser(user);
        schedule.setCourseSections(new ArrayList<>());
        schedule.setHasConflict(false);

        scheduleRepo.save(schedule);

        return loadSchedule(schedule.getId());
    }

    @Transactional
    public ScheduleDTO loadSchedule(Long Id) {

        User currentUser = securityUtil.getCurrentUser().orElseThrow();

        Schedule schedule = scheduleRepo.findByIdAndUser(Id, currentUser)
                .orElseThrow(() -> new RuntimeException("Schedule not found or you do not have permission to access it."));

        List<CourseSectionDTO> sections = schedule.getCourseSections()
                .stream()
                .map(section -> new CourseSectionDTO(
                        section.getSubject(),
                        section.getNumber(),
                        section.getName(),
                        section.getCredits(),
                        section.isLab(),
                        section.isOpen(),
                        section.getLocation(),
                        section.getSection(),
                        section.getSemester(),
                        section.getOpenSeats(),
                        section.getTotalSeats(),
                        section.getFaculty(),
                        section.getTimes()
                ))
                .toList();

        return new ScheduleDTO(
                schedule.getId(),
                schedule.getName(),
                sections,
                new UserDTO(
                        schedule.getUser().getId(),
                        schedule.getUser().getName()
                ),
                schedule.isHasConflict()
        );

    }

    /**
     * Saves a users schedule
     *
     * @param schedule the current schedule the user is on to save
     * @return boolean for successful save or not, boolean response will be sent to frontend
     *         via DTO
     */
    @Transactional
    public boolean saveSchedule(Schedule schedule) {
        try {
            scheduleRepo.save(schedule);
            return true;
        } catch (Exception e) {
            return false;
        }
    }
}
