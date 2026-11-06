package com.aa.calendar.repository;

import com.aa.calendar.entity.Routine;
import com.aa.calendar.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface RoutineRepository extends JpaRepository<Routine,Long> {

    List<Routine> findByUser_UserId(Long userId);

    Optional<Routine> findByUser_UserIdAndRoutineId(Long userId, Long routineId);

    Long user(User user);
}
