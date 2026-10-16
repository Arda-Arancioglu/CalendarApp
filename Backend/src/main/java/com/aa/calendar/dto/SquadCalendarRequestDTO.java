package com.aa.calendar.dto;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.YearMonth;

public record SquadCalendarRequestDTO(

        Long squadId,
        LocalDateTime startTime ,
        LocalDateTime endTime

) {
    public SquadCalendarRequestDTO{
        if (startTime == null) {
            startTime = YearMonth.now().atDay(1).atStartOfDay();
        }
        if(endTime == null){
            endTime = YearMonth.now().atEndOfMonth().atTime(LocalTime.MAX);
        }
        if (startTime.isAfter(endTime)) {
            throw new IllegalArgumentException("startTime cannot be after endTime");
        }

    }


}
