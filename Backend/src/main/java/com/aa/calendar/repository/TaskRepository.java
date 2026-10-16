package com.aa.calendar.repository;

import com.aa.calendar.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

//import java.time.LocalDateTime;
//import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

//    List<Task>  findByStartTimeBetween(LocalDateTime start, LocalDateTime end);

        @Query("SELECT ut.task FROM UserTasks ut WHERE ut.user.userId = :userId AND " +
                "ut.task.endTime > :startTime AND ut.task.startTime < :endTime")
        List<Task> findTasksByUserIdAndDateRange(@Param("userId") Long userId,
                                                 @Param("startTime") LocalDateTime startTime,
                                                 @Param("endTime")  LocalDateTime endTime);
}
