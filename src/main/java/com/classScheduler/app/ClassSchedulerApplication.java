package com.classScheduler.app;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication(exclude = {org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration.class})
@EnableScheduling
public class ClassSchedulerApplication {

    public static void main(String[] args){
        SpringApplication.run(ClassSchedulerApplication.class, args);
    }

}
