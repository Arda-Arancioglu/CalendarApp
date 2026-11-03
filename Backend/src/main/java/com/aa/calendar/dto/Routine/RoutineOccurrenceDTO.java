package com.aa.calendar.dto.Routine;

import java.time.LocalDate;
import java.time.LocalTime;

public record RoutineOccurrenceDTO(
        Long routineId,
        Long routineItemId,
        String title,
        String description,
        LocalDate startDate,
        LocalTime startTime,
        LocalTime endTime,
        String color,
        int dayIndex,
        boolean isRestDay

) {
}
