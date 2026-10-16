package com.aa.calendar.repository;


import com.aa.calendar.entity.UserTasks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface UserTasksRepository extends JpaRepository<UserTasks, Long> {

//    boolean existsByUser_UserIdAndTask_TaskId(Long userId, Long taskId);

    List<UserTasks> findByUser_UserId(Long userId);

//    List<UserTasks> findByTask_TaskId(Long taskId);

    @Query(""" 
           SELECT ut FROM UserTasks ut
           JOIN FETCH ut.task t WHERE ut.user.userId IN :userIds
           AND t.startTime < :endTime    AND t.endTime > :startTime
           """)
    List<UserTasks> findTasksByUserIdsAndDateRange(@Param("userIds") List<Long> userIds,
                                              @Param("startTime") LocalDateTime startTime,
                                              @Param("endTime") LocalDateTime endTime
                                                   );

}
