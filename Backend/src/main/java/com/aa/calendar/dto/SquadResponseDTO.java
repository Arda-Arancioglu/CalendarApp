package com.aa.calendar.dto;

public record SquadResponseDTO(

        Long squadId,

        String squadName,

        String squadDescription,

        String inviteCode
) {
}
