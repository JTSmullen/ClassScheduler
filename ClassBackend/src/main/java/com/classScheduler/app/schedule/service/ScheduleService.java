package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.dto.NewScheduleRequest;
import com.classScheduler.app.schedule.dto.ScheduleDTO;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.schedule.repository.ScheduleRepository;
import com.classScheduler.app.user.dto.UserDTO;
import com.classScheduler.app.user.entities.User;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;


import com.classScheduler.app.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepo;

    public ScheduleService(ScheduleRepository scheduleRepo) {
        this.scheduleRepo = scheduleRepo;
    }

    public CourseSection addCourse(Schedule schedule, CourseSection section) {
        /*
            TODO: Add Course to schedule | Check for conflict here
         */
        return null;
    }

    public void removeCourse(Schedule schedule, CourseSection section) {
        List<CourseSection> courses = schedule.getCourseSections();
        courses.remove(section);
        scheduleRepo.save(schedule);
    }

    public Schedule newSchedule(NewScheduleRequest newScheduleRequest) {
        Schedule schedule = new Schedule();
        schedule.setName(newScheduleRequest.getName());
        schedule.setUser(newScheduleRequest.getUser());
        return schedule;
    }


    public ScheduleDTO loadSchedule(Long Id) {

        Schedule schedule = scheduleRepo.findById(Id).orElseThrow(() -> new RuntimeException("Schedule not found!"));

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
