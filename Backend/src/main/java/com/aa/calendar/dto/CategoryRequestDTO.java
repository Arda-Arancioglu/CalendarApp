package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record CategoryRequestDTO(

        @NotBlank(message="Category name cannot be blank")
        @Size(max = 50 , message="Category name cannot be more than 50")
        String name,

        @NotBlank(message = "Category color cannot be blank")
        @Pattern(regexp = "^#([A-Fa-f0-9]{6})$", message = "Color must be a 6 character hex code such as #3B82F6")
        String color

) {
        public CategoryRequestDTO{
                if(name!=null){
                        name=name.trim();
                }
                if(color!=null){
                        color=color.trim();
                }
        }
}
