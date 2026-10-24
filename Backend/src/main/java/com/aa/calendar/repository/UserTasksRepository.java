package com.aa.calendar.repository;


import com.aa.calendar.entity.RecurrenceType;
import com.aa.calendar.entity.UserTasks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserTasksRepository extends JpaRepository<UserTasks, Long> {

    Optional<UserTasks> findByUser_UserIdAndTask_TaskId(Long userId, Long taskId);

    List<UserTasks> findByUser_UserId(Long userId);

//    List<UserTasks> findByTask_TaskId(Long taskId);

    @Query(""" 
           SELECT ut FROM UserTasks ut
           JOIN FETCH ut.task t WHERE ut.user.userId IN :userIds AND 
                      (
             (t.recurrenceType= :noneType AND t.endTime > :startTime AND t.startTime< :endTime)
                        OR 
            (t.recurrenceType != :noneType AND t.startTime <= :endTime AND 
              (t.recurrenceEndDate IS NULL OR t.recurrenceEndDate>= :startDate))
                         )         
            """)
    List<UserTasks> findTasksByUserIdsAndDateRange(@Param("userIds") List<Long> userIds,
                                              @Param("startTime") LocalDateTime startTime,
                                              @Param("endTime") LocalDateTime endTime,
                                                   @Param("startDate") LocalDate startDate,
                                                   @Param("noneType") RecurrenceType noneType
                                                   );

    void deleteByTask_TaskId(Long id);

    boolean existsByUser_UserIdAndTask_TaskId(Long userId, Long id);
}
