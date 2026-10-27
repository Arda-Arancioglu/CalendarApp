package com.aa.calendar.dto.Squad;

public record SquadResponseDTO(

        Long squadId,

        String squadName,

        String squadDescription,

        String inviteCode
) {
}
