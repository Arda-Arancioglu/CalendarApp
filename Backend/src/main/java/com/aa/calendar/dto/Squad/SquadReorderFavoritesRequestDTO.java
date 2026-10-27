package com.aa.calendar.dto.Squad;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SquadReorderFavoritesRequestDTO(
        @NotNull
        List<Long> squadIds

) {
}
