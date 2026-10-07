package com.aa.calendar.dto;

import java.util.List;

public record SquadDetailResponseDTO(
        Long squadId,
        String squadName,
        String squadDescription,
        String inviteCode,
        List<SquadMemberResponseDTO> members
) {
}
