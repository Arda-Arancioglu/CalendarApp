package com.aa.calendar.repository;

import com.aa.calendar.entity.TaskCategories;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TaskCategoriesRepository extends JpaRepository<TaskCategories,Long> {

    List<TaskCategories> findByTask_TaskId(Long taskId);

    @Modifying
    void deleteByTask_TaskId(Long taskId);

    @Modifying
    void deleteByCategory_CategoryId(@Param("categoryId") Long categoryId);

}
