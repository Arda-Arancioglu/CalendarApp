package com.aa.calendar.dto;

import com.aa.calendar.entity.EventVisibility;
import com.aa.calendar.entity.SquadRole;

import java.util.List;

public record SquadDetailResponseDTO(
        Long squadId,
        String squadName,
        String squadDescription,
        String inviteCode,
        SquadRole myRole,
        EventVisibility myVisibility,
        List<SquadMemberResponseDTO> members

) {
}
