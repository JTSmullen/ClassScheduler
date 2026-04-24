package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseRepository;
import com.classScheduler.app.course.repository.CourseSectionRepository;
import com.classScheduler.app.exception.customs.CourseSectionNotFoundException;
import com.classScheduler.app.exception.customs.ScheduleNotFoundException;
import com.classScheduler.app.exception.customs.ScheduleWithNameAndUserExists;
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
import java.util.Objects;


import org.springframework.transaction.annotation.Transactional;

@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepo;
    private final CourseRepository courseRepo;
    private final SecurityUtil securityUtil;
    private final UserRepository userRepository;
    private final CourseSectionRepository courseSectionRepo;


    public ScheduleService(ScheduleRepository scheduleRepo, CourseRepository courseRepo, SecurityUtil securityUtil, UserRepository userRepository, CourseSectionRepository courseSectionRepo) {

        this.scheduleRepo = scheduleRepo;
        this.courseRepo = courseRepo;
        this.securityUtil = securityUtil;
        this.userRepository = userRepository;
        this.courseSectionRepo = courseSectionRepo;

    }

    @Transactional
    public ScheduleDTO addCourse(Long scheduleId, Long sectionId) {
        // Fetch the Schedule
        User currentUser = securityUtil.getCurrentUser().orElseThrow();
        Schedule schedule = scheduleRepo.findByIdAndUser(scheduleId, currentUser)
                .orElseThrow(() -> new ScheduleNotFoundException("Schedule not found"));

        // Fetch the Section
        CourseSection section = courseSectionRepo.findById(sectionId)
                .orElseThrow(() -> new CourseSectionNotFoundException("Section not found"));

        // Add the section to the list
        schedule.getCourseSections().add(section);
        schedule.setLastSave(new java.sql.Time(System.currentTimeMillis()));

        // Update schedule so checkConflicts can see added course
        scheduleRepo.saveAndFlush(schedule);

        // Check for conflicts
        checkConflict(scheduleId);

        // Save the changes
        scheduleRepo.save(schedule);

        // Return the updated DTO so the frontend sees the change
        return loadSchedule(schedule.getId());
    }

    @Transactional
    public ScheduleDTO removeCourse(Long scheduleId, Long sectionId) {
        // Fetch the Schedule
        User currentUser = securityUtil.getCurrentUser().orElseThrow();
        Schedule schedule = scheduleRepo.findByIdAndUser(scheduleId, currentUser)
                .orElseThrow(() -> new ScheduleNotFoundException("Schedule not found"));

        // Fetch the Section
        CourseSection section = courseSectionRepo.findById(sectionId)
                .orElseThrow(() -> new CourseSectionNotFoundException("Section not found"));

        // Remove the section from the list
        schedule.getCourseSections().remove(section);
        schedule.setLastSave(new java.sql.Time(System.currentTimeMillis()));

        // Update schedule so checkConflicts can see added course
        scheduleRepo.saveAndFlush(schedule);

        // Check for conflicts
        checkConflict(scheduleId);

        // Save the changes
        scheduleRepo.save(schedule);

        // Return the updated DTO so the frontend sees the change
        return loadSchedule(schedule.getId());
    }

    // Helper method
    public boolean overlapClassTime(ClassTime t1, ClassTime t2) {
        if (!Objects.equals(t1.getDay(), t2.getDay())) {
            return false;
        }
        return t1.getStartTime().isBefore(t2.getEndTime()) &&
                t1.getEndTime().isAfter(t2.getStartTime());
    }

    @Transactional
    public ScheduleDTO checkConflict(Long scheduleId) {
        // Fetch the Schedule
        User currentUser = securityUtil.getCurrentUser().orElseThrow();
        Schedule schedule = scheduleRepo.findByIdAndUser(scheduleId, currentUser)
                .orElseThrow(() -> new RuntimeException("Schedule not found"));

        List<CourseSection> sections = schedule.getCourseSections();
        boolean conflictFound = false;

        for (int i = 0; i < sections.size(); i++) {
            for (int j = i + 1; j < sections.size(); j++) {

                List<ClassTime> timesI = sections.get(i).getTimes();
                List<ClassTime> timesJ = sections.get(j).getTimes();

                for (ClassTime tI : timesI) {
                    for (ClassTime tJ : timesJ) {
                        if (overlapClassTime(tI, tJ)) {
                            conflictFound = true;
                            break;
                        }
                    }
                    if (conflictFound) break;
                }
                if (conflictFound) break;
            }
            if (conflictFound) break;
        }
        schedule.setHasConflict(conflictFound);
        // Save the changes
        scheduleRepo.save(schedule);

        // Return the updated DTO so the frontend sees the change
        return loadSchedule(schedule.getId());
    }

    @Transactional
    public ScheduleDTO newSchedule(NewScheduleRequest newScheduleRequest) {
        Long userId = securityUtil.getCurrentUser().orElseThrow().getId();
        User user = userRepository.findById(userId).orElseThrow();

        if (scheduleRepo.existsByUserAndName(user, newScheduleRequest.getName())) {
            throw new ScheduleWithNameAndUserExists("Schedule with name " + newScheduleRequest.getName() + " already exists");
        }

        Schedule schedule = new Schedule();
        schedule.setName(newScheduleRequest.getName());
        schedule.setUser(user);
        schedule.setCourseSections(new ArrayList<>());
        schedule.setHasConflict(false);
        schedule.setLastSave(new java.sql.Time(System.currentTimeMillis()));
        schedule.setSemester(newScheduleRequest.getSemester());

        scheduleRepo.save(schedule);

        return loadSchedule(schedule.getId());
    }

    @Transactional
    public void deleteSchedule(Long Id) {
        User currentUser = securityUtil.getCurrentUser().orElseThrow();

        Schedule schedule = scheduleRepo.findByIdAndUser(Id, currentUser)
                .orElseThrow(() -> new ScheduleNotFoundException("Schedule not found!"));

        scheduleRepo.delete(schedule);
    }

    @Transactional
    public ScheduleDTO loadSchedule(Long Id) {

        User currentUser = securityUtil.getCurrentUser().orElseThrow();

        Schedule schedule = scheduleRepo.findByIdAndUser(Id, currentUser)
                .orElseThrow(() -> new ScheduleNotFoundException("Schedule not found or you do not have permission to access it."));

        List<CourseSectionDTO> sections = schedule.getCourseSections()
                .stream()
                .map(section -> new CourseSectionDTO(
                        section.getId(),
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

}
