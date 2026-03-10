package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.user.entities.User;

import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Objects;

@Service
public class ConflictService {
/**
overlapClassTime takes two ClassTime objects
and compares them to see if they overlap.
@return boolean (true if there is a conflict and false if not)
 */
    public boolean overlapClassTime(ClassTime t1, ClassTime t2) {
        if (Objects.equals(t1.getDay(), t2.getDay())) {
            if (t1.getStartTime().isAfter(t2.getStartTime()) || t1.getStartTime().equals(t2.getStartTime())) {
                if (t1.getStartTime().isBefore(t2.getEndTime())) {
                    return true;
                }
            }
        }

        if (Objects.equals(t1.getDay(), t2.getDay())) {
            if (t2.getStartTime().isAfter(t1.getStartTime()) || t2.getStartTime().equals(t1.getStartTime())) {
                if (t2.getStartTime().isBefore(t1.getEndTime())) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * checks the list of CourseSections in schedule for conflicts
     * @param schedule is the schedule being checked
     * @return boolean
     */
    public boolean checkConflict(Schedule schedule) {

        List<CourseSection> c = schedule.getCourseSections();
        for (int i = 0; i < c.size(); i++) {
            for (int j = 0; j < c.size(); j++) {
                if (i != j) {
                    List<ClassTime> iTimes = c.get(i).getTimes();
                    List<ClassTime> jTimes = c.get(j).getTimes();
                    for (int k = 0; k < iTimes.size(); k++) {
                        for (int l = 0; l < jTimes.size(); l++) {
                            if (k != l) {
                                if (overlapClassTime(iTimes.get(k), jTimes.get(l))) {
                                    return true;
                                }
                            }
                        }
                    }
                }
            }
        }
        return false;
    }

    public List<Schedule> getConflicts(User user) {
        /*
            TODO: Return all candidate Schedules with a conflict
         */
        return null;
    }

}
