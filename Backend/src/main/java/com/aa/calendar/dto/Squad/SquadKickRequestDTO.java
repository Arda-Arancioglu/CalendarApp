package com.aa.calendar.dto.Squad;

import jakarta.validation.constraints.NotNull;

public record SquadKickRequestDTO(
        @NotNull(message = "Target id cannot be empty")
        Long targetUserId

) {
}
