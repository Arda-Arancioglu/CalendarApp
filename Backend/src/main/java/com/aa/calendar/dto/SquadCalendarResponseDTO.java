package com.aa.calendar.dto;

import java.util.List;

public record SquadCalendarResponseDTO(

        Long userId,
        List<SquadEventResponseDTO> membersTasks


) {
}
