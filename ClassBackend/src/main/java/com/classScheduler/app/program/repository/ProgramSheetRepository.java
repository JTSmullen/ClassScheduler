package com.classScheduler.app.program.repository;

import com.classScheduler.app.program.entity.ProgramSheet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ProgramSheetRepository extends JpaRepository<ProgramSheet, Long> {
    Optional<ProgramSheet> findByProgramCode(String programCode);
}