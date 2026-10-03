package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;
import java.util.Set;

public record EventRequestDTO (

        @NotBlank(message = "Title cannot be blank")
        String title,

        String description,

        @NotNull
        LocalDateTime startTime ,

        @NotNull
        LocalDateTime endTime,

        Boolean isFlexible,

        Set<Long> categoryIds




){}
