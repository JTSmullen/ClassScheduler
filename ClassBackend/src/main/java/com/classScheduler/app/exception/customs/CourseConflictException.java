package com.classScheduler.app.exception.customs;

public class CourseConflictException extends RuntimeException{
    public CourseConflictException (String message) {
        super(message);
    }
}
