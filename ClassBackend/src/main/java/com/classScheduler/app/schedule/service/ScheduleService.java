package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.schedule.repository.ScheduleRepository;
import com.classScheduler.app.user.entities.User;

import org.springframework.stereotype.Service;

import java.util.List;



import com.classScheduler.app.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.transaction.annotation.Transactional;


@Service
public class ScheduleService {

    private final ScheduleRepository scheduleRepo;

    public ScheduleService(ScheduleRepository scheduleRepo) {
        this.scheduleRepo = scheduleRepo;
    }

    public void addCourse(Schedule schedule, CourseSection section) {
        List<CourseSection> courses = schedule.getCourseSections();
        courses.add(section);
        scheduleRepo.save(schedule);
    }

    public void removeCourse(Schedule schedule, CourseSection section) {
        List<CourseSection> courses = schedule.getCourseSections();
        courses.remove(section);
        scheduleRepo.save(schedule);
    }

    public Schedule newSchedule(User user, String name) {
        /*
            TODO: Create a new schedule for User with name
         */
        return null;
    }

    public Schedule loadSchedule(Long Id) {
        /*
            TODO: Load a Schedule by the Id
         */
        return null;
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
