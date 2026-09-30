package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;

public record UserRequestDTO (

        @NotBlank(message = " username cannot be blank")
        String username,

        @NotBlank(message = " password cannot be blank" )
        String password,

        @NotNull
        LocalDate birthDate

){}
