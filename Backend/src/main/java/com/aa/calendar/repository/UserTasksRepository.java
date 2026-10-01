package com.aa.calendar.repository;


import com.aa.calendar.entity.UserTasks;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserTasksRepository extends JpaRepository<UserTasks, Long> {

    boolean existsByUser_UserIdAndTask_TaskId(Long userId, Long taskId);

    List<UserTasks> findByUser_UserId(Long userId);

//    List<UserTasks> findByTask_TaskId(Long taskId);

}
