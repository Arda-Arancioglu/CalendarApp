package com.aa.calendar.dto.Routine;

import java.time.LocalTime;

public record RoutineItemDTO(
        int dayIndex,
        String title,
        String description,
        LocalTime startTime,
        LocalTime endTime,
        boolean isRestDay
) {
}
