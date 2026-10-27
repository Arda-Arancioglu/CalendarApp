package com.aa.calendar.dto.Squad;

import com.aa.calendar.entity.SquadRole;
import jakarta.validation.constraints.NotNull;


public record UpdateRoleRequestDTO(
        @NotNull(message= "Role cannot be null")
        SquadRole role,
        @NotNull(message= "Squad Id cannot be null")
        Long squadId,
        @NotNull
        Long targetUserId
) {
}
