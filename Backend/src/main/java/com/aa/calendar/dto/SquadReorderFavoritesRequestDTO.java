package com.aa.calendar.dto;

import jakarta.validation.constraints.NotNull;

import java.util.List;

public record SquadReorderFavoritesRequestDTO(
        @NotNull
        List<Long> squadIds

) {
}
