package com.aa.calendar.repository;

import com.aa.calendar.entity.TaskException;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface TaskExceptionRepository extends JpaRepository<TaskException, Long> {

    List<TaskException> findAllByTask_TaskId(Long taskId);

    List<TaskException> findByTask_TaskIdIn(List<Long> taskIds);

    Optional<TaskException> findByTask_TaskIdAndOriginalDate(Long taskId, LocalDate originalDate);

    void deleteByTask_TaskId(Long taskId);

}
