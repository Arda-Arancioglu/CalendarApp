package com.aa.calendar.dto.Routine;

import java.time.LocalDate;

public record RoutineShiftRequestDTO(

        LocalDate shiftDate,
        int shiftDays,
        boolean extendEndDate
) {
}
