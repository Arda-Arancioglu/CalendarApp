package com.aa.calendar.dto;

import jakarta.validation.constraints.NotBlank;

public record SquadJoinRequestDTO(

        @NotBlank(message = "Invite code is required")
        String inviteCode


) {
}
