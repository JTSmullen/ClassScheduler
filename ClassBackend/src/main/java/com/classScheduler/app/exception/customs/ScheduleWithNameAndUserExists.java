package com.classScheduler.app.exception.customs;

public class ScheduleWithNameAndUserExists extends RuntimeException {
    public ScheduleWithNameAndUserExists(String message) {
        super(message);
    }
}
