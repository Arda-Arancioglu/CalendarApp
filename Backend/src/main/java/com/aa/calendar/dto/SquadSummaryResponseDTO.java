package com.aa.calendar.dto;

import com.aa.calendar.entity.SquadRole;

public record SquadSummaryResponseDTO(

        Long squadId,
        String squadName,
        String squadDescription,
        SquadRole role

) {
}
