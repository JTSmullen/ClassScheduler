package com.classScheduler.app.schedule.service;

import com.classScheduler.app.course.entity.ClassTime;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.user.entities.User;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConflictService {

    public boolean sameClassTime(ClassTime t1, ClassTime t2) {
        if (t1.getStartTime().equals(t2.getStartTime()) && t1.getDay().equals(t2.getDay())) {
            return true;
        }
        return false;
    }

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
                                if (sameClassTime(iTimes.get(k), jTimes.get(l))) {
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
