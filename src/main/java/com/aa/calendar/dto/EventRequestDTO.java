package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDateTime;

public record EventRequestDTO (

        @NotBlank(message = "Title cannot be blank")
        String title,

        String description,
        @NotNull
        LocalDateTime startTime ,
        @NotNull
        LocalDateTime endTime

){}
