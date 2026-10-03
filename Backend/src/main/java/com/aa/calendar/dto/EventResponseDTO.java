package com.aa.calendar.dto;
import java.time.LocalDateTime;
import java.util.Set;

public record EventResponseDTO(

        Long TaskId,
        String title,
        String description,
        LocalDateTime startTime,
        LocalDateTime endTime,
        boolean isFlexible,
        Set<CategoryResponseDTO> categories


) {}
