package com.aa.calendar.dto.Routine;

import java.time.LocalDate;
import java.util.List;

public record RoutineResponseDTO(
        Long routineId,
        String title,
        String description,
        int cycleLength,
        LocalDate startDate,
        LocalDate endDate,
        String color,
        List<RoutineItemDTO> items,
        boolean isActive

) {
}
