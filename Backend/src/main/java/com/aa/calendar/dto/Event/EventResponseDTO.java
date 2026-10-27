package com.aa.calendar.dto.Event;
import com.aa.calendar.dto.Category.CategoryResponseDTO;
import com.aa.calendar.entity.RecurrenceType;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public record EventResponseDTO(

        String occurrenceId,
        Long taskId,
        String title,
        String description,
        LocalDateTime startTime,
        LocalDateTime endTime,
        Boolean isFlexible,
        Set<CategoryResponseDTO> categories,
        Boolean isPrivate,
        RecurrenceType recurrenceType,
        LocalDate recurrenceEndDate,
        Integer  recurrenceInterval,
        String recurrenceDays

) {}
