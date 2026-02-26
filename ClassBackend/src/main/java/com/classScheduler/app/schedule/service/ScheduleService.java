package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.schedule.repository.ScheduleRepository;
import com.classScheduler.app.user.entities.User;

import org.springframework.stereotype.Service;

import java.util.List;



import com.classScheduler.app.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;


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

    public Schedule saveSchedule(Schedule schedule) {
        /*
            TODO: Save a Schedule To the User
         */
        return null;
    }
}
