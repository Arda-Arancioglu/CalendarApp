package com.aa.calendar.repository;

import com.aa.calendar.entity.Routine;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RoutineRepository extends JpaRepository<Routine,Long> {

    List<Routine> findByUser_UserId(Long userId);

}
