package com.aa.calendar.service;

import com.aa.calendar.dto.CategoryRequestDTO;
import com.aa.calendar.dto.CategoryResponseDTO;
import com.aa.calendar.entity.Category;
import com.aa.calendar.entity.User;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.CategoryRepository;
import com.aa.calendar.repository.TaskCategoriesRepository;
import com.aa.calendar.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final UserRepository userRepository;
    private final TaskCategoriesRepository taskCategoriesRepository;

    public CategoryService(CategoryRepository categoryRepository, UserRepository userRepository, TaskCategoriesRepository taskCategoriesRepository) {
        this.categoryRepository = categoryRepository;
        this.userRepository = userRepository;
        this.taskCategoriesRepository = taskCategoriesRepository;
    }

    public List<CategoryResponseDTO> getAllForUser(Long userId) {
        return categoryRepository.findByUser_UserId(userId)
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    @Transactional
    public CategoryResponseDTO create(CategoryRequestDTO dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(()-> new ResourceNotFoundException("User not found with id: " + userId));

        if(categoryRepository.existsByNameIgnoreCaseAndUser_UserId(dto.name().trim(),userId)){
            throw new BadRequestException("Category with name " + dto.name() + " already exists");
        }

        Category category = new Category();
        category.setName(dto.name());
        category.setColor(dto.color());
        category.setUser(user);

        return mapToDTO(categoryRepository.save(category));
    }
    @Transactional
    public CategoryResponseDTO update(Long categoryId, CategoryRequestDTO dto, Long userId) {
        Category category = categoryRepository.findByCategoryIdAndUser_UserId(categoryId, userId )
                .orElseThrow(()-> new ResourceNotFoundException("Category not found with id: " + categoryId));
        category.setName(dto.name());
        category.setColor(dto.color());
        return mapToDTO(categoryRepository.save(category));
    }

    @Transactional
    public void delete(Long categoryId, Long userId) {
        Category category = categoryRepository.findByCategoryIdAndUser_UserId(categoryId,userId)
                .orElseThrow(()-> new ResourceNotFoundException("Category not found with id: " + categoryId));

        taskCategoriesRepository.deleteByCategory_CategoryId(categoryId);
        categoryRepository.delete(category);

    }

    public CategoryResponseDTO  mapToDTO (Category category){
        return new CategoryResponseDTO(
                category.getCategoryId(),
                category.getName(),
                category.getColor()
        );
    }



}
