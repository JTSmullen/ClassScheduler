package com.classScheduler.app.schedule.service;

import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.user.entity.User;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class ConflictService {

    public boolean checkConflict(Schedule schedule) {
        /*
            TODO: Check if the Schedule has a Conflict
         */
        return false;
    }

    public List<Schedule> getConflicts(User user) {
        /*
            TODO: Return all candidate Schedules with a conflict
         */
        return null;
    }

}
