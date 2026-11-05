package com.aa.calendar.repository;

import com.aa.calendar.entity.RoutineShift;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RoutineShiftRepository extends JpaRepository<RoutineShift, Long >{

    List<RoutineShift> findByRoutine_RoutineIdOrderByShiftDateAsc(Long routineId);
}
