package com.aa.calendar.dto;

import com.aa.calendar.entity.RecurrenceType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Set;

public record EventRequestDTO (

        @NotBlank(message = "Title cannot be blank")
        @Size(max=100, message = "Title cannot be longer than 100 characters" )
        String title,

        @Size(max=1000, message = "Description cannot be longer than 1000 characters" )
        String description,

        @NotNull(message= "Start time cannot be null")
        LocalDateTime startTime ,

        @NotNull(message = "End time cannot be null")
        LocalDateTime endTime,

        Boolean isFlexible,

        Set<Long> categoryIds,

        Boolean isPrivate,

        RecurrenceType recurrenceType,

        LocalDate recurrenceEndDate


){
        public EventRequestDTO{
                if(title!=null){
                        title=title.trim();
                }
                if(description != null){
                        description = description.trim();
                        if(description.isEmpty()){
                                description = null;
                        }
                }
                if (isFlexible == null) {
                        isFlexible = false;
                }
                if (isPrivate==null) {
                        isPrivate = true;
                }
                if (categoryIds == null){
                        categoryIds = Set.of();
                }
                if (recurrenceType == null) {
                        recurrenceType = RecurrenceType.NONE;
                }

        }


}
