package com.aa.calendar.dto.Squad;

import java.util.List;

public record SquadCalendarResponseDTO(

        Long userId,
        String username,
        List<SquadEventResponseDTO> events


) {
}
