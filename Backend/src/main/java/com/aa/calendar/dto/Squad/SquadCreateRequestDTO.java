package com.aa.calendar.dto.Squad;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SquadCreateRequestDTO(
        @NotBlank(message = "Squad name is required")
        @Size(max=100, message = "Squad name cannot be longer than 100 characters" )
        String squadName,

        @Size(max=500, message = "Squad description cannot be longer than 500 characters" )
        String squadDescription
) {
}
