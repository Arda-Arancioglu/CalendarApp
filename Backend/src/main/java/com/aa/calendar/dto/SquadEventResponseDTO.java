package com.aa.calendar.dto;

import java.time.LocalDateTime;

public record SquadEventResponseDTO(
        Long taskId,
        String title,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isFlexible
) {
}
