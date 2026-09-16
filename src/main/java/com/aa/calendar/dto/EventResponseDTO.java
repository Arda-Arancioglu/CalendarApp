package com.aa.calendar.dto;
import java.time.LocalDateTime;

public record EventResponseDTO(

        Long id ,
        String title,
        String description,
        LocalDateTime startTime,
        LocalDateTime endTime


) {}
