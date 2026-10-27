package com.aa.calendar.dto.User;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ThemeUpdateRequestDTO(
        @NotBlank (message="theme cannot be blank")
        @Size(max = 32 , message = "Theme name too long")
        String theme
) {
}
