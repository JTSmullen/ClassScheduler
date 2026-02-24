package com.classScheduler.app.schedule.repository;

import com.classScheduler.app.schedule.entity.Schedule;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ScheduleRepository extends JpaRepository <Schedule, Long> { }
