package com.classScheduler.app.exception.customs;

public class ScheduleNotFoundException extends RuntimeException{

    public ScheduleNotFoundException(String message){
        super(message);
    }

}
