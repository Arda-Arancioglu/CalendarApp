package com.aa.calendar.service;

import com.aa.calendar.dto.CategoryResponseDTO;
import com.aa.calendar.dto.EventResponseDTO;
import com.aa.calendar.entity.RecurrenceType;
import com.aa.calendar.entity.Task;
import com.aa.calendar.entity.TaskException;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Component
public class RecurrenceExpander {

    public List<EventResponseDTO> expandTask(Task task,
                                             Set<CategoryResponseDTO> categories,
                                             LocalDateTime windowStart,
                                             LocalDateTime windowEnd,
                                             Map<LocalDate, TaskException> exceptionsMap) {
        List<EventResponseDTO> result = new ArrayList<>();

        if (task.getRecurrenceType() == null || task.getRecurrenceType() == RecurrenceType.NONE) {
            if(task.getEndTime().isAfter(windowStart) && task.getStartTime().isBefore(windowEnd)){
                result.add(toDTO(task,task.getStartTime(),task.getEndTime(),categories,task.getTitle(),task.getDescription()));
            }
            return result;
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

            LocalDate occDate = occStart.toLocalDate();

            if(exceptionsMap!= null && exceptionsMap.containsKey(occDate)){
                TaskException exception = exceptionsMap.get(occDate);
                if(exception.isCancelled()){
                    continue;
                }

                LocalDateTime customStart = exception.getNewStartTime()!= null ? exception.getNewStartTime():occStart;
                LocalDateTime customEnd = exception.getNewEndTime()!= null ? exception.getNewEndTime():occEnd;
                String customTitle = exception.getNewTitle()!= null? exception.getNewTitle():task.getTitle();
                String customDescription = exception.getNewDescription()!= null? exception.getNewDescription(): task.getDescription();

                if(customEnd.isAfter(windowStart)&&customStart.isBefore(windowEnd)){
                    result.add(toDTO(task,customStart,customEnd,categories,customTitle,customDescription));
                }
                continue;
            }

            if (occEnd.isAfter(windowStart)){
                result.add(toDTO(task,occStart,occEnd,categories,task.getTitle(),task.getDescription()));
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
                                   LocalDateTime end, Set<CategoryResponseDTO> categories,
                                   String title, String description) {
        String occurenceId = task.getTaskId()+"_"+start.toString();
        return new EventResponseDTO(
                occurenceId,
                task.getTaskId(),
                title,
                description,
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
