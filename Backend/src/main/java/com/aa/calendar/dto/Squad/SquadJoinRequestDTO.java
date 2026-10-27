package com.aa.calendar.dto.Squad;

import jakarta.validation.constraints.NotBlank;

public record SquadJoinRequestDTO(

        @NotBlank(message = "Invite code is required")
        String inviteCode


) {
}
