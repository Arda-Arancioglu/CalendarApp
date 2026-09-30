package com.aa.calendar.repository;

import com.aa.calendar.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task>  findByStartTimeBetween(LocalDateTime start, LocalDateTime end);
}
