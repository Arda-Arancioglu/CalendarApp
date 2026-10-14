package com.aa.calendar.dto;

import com.aa.calendar.entity.EventVisibility;
import jakarta.validation.constraints.NotNull;

public record UpdateVisibilityRequestDTO(

        @NotNull(message="Visibility cannot be null")
        EventVisibility visibility,
        Long squadId

) {
}
