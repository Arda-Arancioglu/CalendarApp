package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record CategoryRequestDTO(

        @NotBlank(message="Category name cannot be blank")
        String name,

        @NotBlank(message = "Category color cannot be blank")
        @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Color must be a 6 character hex code such as #3B82F6")
        String color

) {
}
