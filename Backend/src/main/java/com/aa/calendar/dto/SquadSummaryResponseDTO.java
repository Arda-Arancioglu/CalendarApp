package com.aa.calendar.dto;

import com.aa.calendar.entity.EventVisibility;
import com.aa.calendar.entity.SquadRole;

public record SquadSummaryResponseDTO(

        Long squadId,
        String squadName,
        String squadDescription,
        EventVisibility myVisibility,
        SquadRole role,
        Integer favoriteOrder

) {
}
