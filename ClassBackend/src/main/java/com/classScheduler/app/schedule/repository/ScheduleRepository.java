package com.classScheduler.app.schedule.repository;

import com.classScheduler.app.schedule.entity.Schedule;
import com.classScheduler.app.user.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface ScheduleRepository extends JpaRepository<Schedule, Long> {
    Optional<Schedule> findByIdAndUser(Long id, User user);
    boolean existsByUserAndName(User user, String name);
}

