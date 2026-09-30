package com.aa.calendar.dto;

import java.time.LocalDate;

public record RegisterRequest(
//        Can add these but already have a failsafe in service layer no need to complicate things
//        @NotBlank (message = "Username cannot be blank")
//        @Size(min=3,max=50,message="Username must be between 3 and 50 characters")

        String username,

        String password,

        LocalDate   birthDate

)
{
}
