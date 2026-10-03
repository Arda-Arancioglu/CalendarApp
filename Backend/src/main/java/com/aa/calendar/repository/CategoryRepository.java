package com.aa.calendar.repository;

import com.aa.calendar.entity.Category;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface CategoryRepository extends JpaRepository<Category,Long> {
    List<Category> findByUser_UserId(Long userId);

    Optional<Category> findByCategoryIdAndUser_UserId(Long categoryId, Long userId);

    Set<Category> findAllByCategoryIdInAndUser_UserId(Set<Long> categoryId, Long userId);

    boolean existsByNameIgnoreCaseAndUser_UserId(String name, Long userUserId);

}
