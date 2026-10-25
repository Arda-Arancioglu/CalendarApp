package com.aa.calendar.dto;
import com.aa.calendar.entity.RecurrenceType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public record EventResponseDTO(

        String occurenceId,
        Long taskId,
        String title,
        String description,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isFlexible,
        Set<CategoryResponseDTO> categories,
        Boolean isPrivate,
        RecurrenceType recurrenceType,
        LocalDate recurrenceEndDate

) {}
