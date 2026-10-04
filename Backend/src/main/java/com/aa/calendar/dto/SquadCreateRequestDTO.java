package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;

public record SquadCreateRequestDTO(
        @NotBlank(message = "Squad name is required")
        String squadName,

        String squadDescription
) {
}
