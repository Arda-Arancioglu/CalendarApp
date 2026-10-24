package com.aa.calendar.service;

import com.aa.calendar.dto.CategoryResponseDTO;
import com.aa.calendar.dto.EventResponseDTO;
import com.aa.calendar.entity.RecurrenceType;
import com.aa.calendar.entity.Task;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Component
public class RecurrenceExpander {

    public List<EventResponseDTO> expandTask(Task task,
                                             Set<CategoryResponseDTO> categories,
                                             LocalDateTime windowStart,
                                             LocalDateTime windowEnd) {
        List<EventResponseDTO> result = new ArrayList<>();
        if (task.getRecurrenceType() == null || task.getRecurrenceType() == RecurrenceType.NONE) {
            if(task.getEndTime().isAfter(windowStart) && task.getStartTime().isBefore(windowEnd)){
                result.add(toDTO(task,task.getStartTime(),task.getEndTime(),categories));
            }
        }
        Duration duration = Duration.between(task.getStartTime(), task.getEndTime());
        long firstK = calculateFirstK(task,windowStart);

        for (long k =firstK ; ; k++){
            LocalDateTime occStart = calculateOccurenceStart(task.getStartTime(),task.getRecurrenceType(),k);

            if(occStart.isAfter(windowEnd)){
                break;
            }

            if(task.getRecurrenceEndDate() != null
                    && occStart.isAfter(task.getRecurrenceEndDate().atTime(23,59,59))){
                break;
            }

            LocalDateTime occEnd = occStart.plus(duration);

            if (occEnd.isAfter(windowStart)){
                result.add(toDTO(task,occStart,occEnd,categories));
            }


        }

        return result;
    }

    private LocalDateTime calculateOccurenceStart(LocalDateTime startTime,RecurrenceType recurrenceType,long k){
        return switch(recurrenceType){
            case DAILY -> startTime.plusDays(k);
            case WEEKLY -> startTime.plusWeeks(k);
            case MONTHLY -> startTime.plusMonths(k);
            case YEARLY -> startTime.plusYears(k);
            default -> startTime;
        };
    }

    private long calculateFirstK(Task task, LocalDateTime windowStart) {
        if(task.getStartTime().isAfter(windowStart)){
            return 0;
        }
        return switch (task.getRecurrenceType()){
            case DAILY -> Math.max(0, ChronoUnit.DAYS.between(task.getStartTime(), windowStart)-1);
            case WEEKLY -> Math.max(0, ChronoUnit.WEEKS.between(task.getStartTime(), windowStart)-1);
            default -> 0;
        };
    }


    private EventResponseDTO toDTO(Task task, LocalDateTime start,
                                   LocalDateTime end, Set<CategoryResponseDTO> categories) {
        return new EventResponseDTO(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                start,
                end,
                task.isFlexible(),
                categories,
                task.isPrivate(),
                task.getRecurrenceType(),
                task.getRecurrenceEndDate()
        );
    }

}
