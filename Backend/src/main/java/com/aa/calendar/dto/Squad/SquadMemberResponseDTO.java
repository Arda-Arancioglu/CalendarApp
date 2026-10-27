package com.aa.calendar.dto.Squad;

import com.aa.calendar.entity.SquadRole;

import java.time.LocalDateTime;

public record SquadMemberResponseDTO(
        Long userId,
        String username,
        SquadRole role,
        LocalDateTime joinedAt
) {
}
