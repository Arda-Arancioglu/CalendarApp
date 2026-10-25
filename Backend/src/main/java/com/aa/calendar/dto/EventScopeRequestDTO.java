package com.aa.calendar.dto;

import com.aa.calendar.entity.RecurrenceScope;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;

public record EventScopeRequestDTO(

        @NotNull(message="Scope must be provided")
        RecurrenceScope scope,

        List<LocalDate> selectedDates,

        LocalDate fromDate,

        EventRequestDTO updateData
) {
}
