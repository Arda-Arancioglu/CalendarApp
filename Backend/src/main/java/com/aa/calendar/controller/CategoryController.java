package com.aa.calendar.controller;

import com.aa.calendar.dto.CategoryRequestDTO;
import com.aa.calendar.dto.CategoryResponseDTO;
import com.aa.calendar.service.CategoryService;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/categories")
public class CategoryController {

    private final CategoryService categoryService;

   CategoryController(CategoryService categoryService) {
        this.categoryService = categoryService;
   }

   @GetMapping
   public ResponseEntity<List<CategoryResponseDTO>> getCategories(Authentication auth) {
       Long userId = (Long) auth.getPrincipal();
       return ResponseEntity.ok(categoryService.getAllForUser(userId));
   }

   @PostMapping
    public ResponseEntity<CategoryResponseDTO> createCategory(@Valid @RequestBody CategoryRequestDTO dto,Authentication auth) {
       Long userId = (Long) auth.getPrincipal();
       return ResponseEntity.status(HttpStatus.CREATED).body(categoryService.create(dto,userId));
   }

   @PutMapping("/{id}")
    public ResponseEntity<CategoryResponseDTO> updateCategory(@PathVariable Long id , @Valid @RequestBody CategoryRequestDTO dto, Authentication auth) {
       Long userId = (Long) auth.getPrincipal();
       return ResponseEntity.ok(categoryService.update(id,dto,userId));
   }

   @DeleteMapping("/{id}")
    public ResponseEntity<CategoryResponseDTO> deleteCategory(@PathVariable Long id, Authentication auth) {
       Long userId = (Long) auth.getPrincipal();
       categoryService.delete(id,userId);
       return ResponseEntity.noContent().build();
   }


}
