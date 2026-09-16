package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;

import java.time.LocalDateTime;

public record EventRequestDTO (

        @NotBlank(message = "Title cannot be blank")
        String title,

        String description,

        LocalDateTime startTime ,
        LocalDateTime endTime

){}
