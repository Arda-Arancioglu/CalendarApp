package com.aa.calendar.service;

import com.aa.calendar.dto.CategoryResponseDTO;
import com.aa.calendar.dto.EventResponseDTO;
import com.aa.calendar.entity.RecurrenceType;
import com.aa.calendar.entity.Task;
import com.aa.calendar.entity.TaskException;
import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Component
public class RecurrenceExpander {

    public List<EventResponseDTO> expandTask(Task task,
                                             Set<CategoryResponseDTO> categories,
                                             LocalDateTime windowStart,
                                             LocalDateTime windowEnd,
                                             Map<LocalDate, TaskException> exceptionsMap) {

        List<EventResponseDTO> result = new ArrayList<>();

        if (task.getRecurrenceType() == null || task.getRecurrenceType() == RecurrenceType.NONE) {
            if (task.getEndTime().isAfter(windowStart) && task.getStartTime().isBefore(windowEnd)) {
                result.add(toDTO(task, task.getStartTime(), task.getEndTime(), categories, task.getTitle(), task.getDescription()));
            }
            return result;
        }
        Duration duration = Duration.between(task.getStartTime(), task.getEndTime());

        boolean isMultiDayWeekly = task.getRecurrenceType() == RecurrenceType.WEEKLY
                && task.getRecurrenceDays() != null
                && !task.getRecurrenceDays().isBlank();

        int interval = (task.getRecurrenceInterval() != null && task.getRecurrenceInterval() > 0)
                ? task.getRecurrenceInterval() : 1;
        long firstK = calculateFirstK(task,windowStart,interval);

        if(isMultiDayWeekly) {

            List<DayOfWeek> targetDays = Arrays.stream(task.getRecurrenceDays().split(","))
                    .map(String::trim).filter(s->!s.isEmpty())
                    .map(DayOfWeek::valueOf)
                    .sorted()
                    .toList();

            for(long k = firstK; ; k++) {
                LocalDateTime weekBase =  task.getStartTime().plusWeeks(k*interval);
                LocalDate mondayOfWeek = weekBase.toLocalDate().with(DayOfWeek.MONDAY);
                if(mondayOfWeek.atStartOfDay().isAfter(windowEnd)){
                    break;
                }
                for(DayOfWeek day: targetDays) {
                    LocalDate occDate = mondayOfWeek.with(day);
                    LocalDateTime occStart = LocalDateTime.of(occDate,task.getStartTime().toLocalTime());
                    addOccurrenceIfValid(task,occStart,duration,windowStart,windowEnd,categories,exceptionsMap,result);

                }
            }


        }else{
            for (long k = firstK; ; k++) {
                LocalDateTime occStart = calculateOccurrenceStart(task.getStartTime(),task.getRecurrenceType(),k,interval);
                if(occStart.isAfter(windowEnd)) {
                    break;
                }
                if(task.getRecurrenceEndDate()!=null &&
                        occStart.isAfter(task.getRecurrenceEndDate().atTime(23,59,59))){
                    break;
                }
                addOccurrenceIfValid(task,occStart,duration,windowStart,windowEnd,categories,exceptionsMap,result);
            }
        }
        return result;
    }

    private LocalDateTime calculateOccurrenceStart(LocalDateTime startTime,RecurrenceType recurrenceType,long k,Integer interval){
        return switch(recurrenceType){
            case DAILY -> startTime.plusDays(k*interval);
            case WEEKLY -> startTime.plusWeeks(k*interval);
            case MONTHLY -> startTime.plusMonths(k*interval);
            case YEARLY -> startTime.plusYears(k*interval);
            default -> startTime;
        };
    }

    private long calculateFirstK(Task task, LocalDateTime windowStart,Integer interval) {
        if(task.getStartTime().isAfter(windowStart)){
            return 0;
        }
        return switch (task.getRecurrenceType()){
            case DAILY -> Math.max(0, (ChronoUnit.DAYS.between(task.getStartTime(), windowStart)/interval)-1);
            case WEEKLY -> Math.max(0, (ChronoUnit.WEEKS.between(task.getStartTime(), windowStart)/interval)-1);
            default -> 0;
        };
    }

    private void addOccurrenceIfValid (Task task, LocalDateTime occStart,
                                       Duration duration, LocalDateTime windowStart,
                                       LocalDateTime windowEnd, Set<CategoryResponseDTO> categories,
                                       Map<LocalDate,TaskException> exceptionsMap, List<EventResponseDTO> result){
        if(occStart.isBefore(task.getStartTime()) || occStart.isAfter(windowEnd)){
            return;
        }
        if(task.getRecurrenceEndDate() != null &&
        occStart.isAfter(task.getRecurrenceEndDate().atTime(23,59,59))){
            return;
        }
        LocalDateTime occEnd = occStart.plus(duration);
        LocalDate occDate = occStart.toLocalDate();

        if (exceptionsMap != null && exceptionsMap.containsKey(occDate)) {
            TaskException exception = exceptionsMap.get(occDate);
            if (exception.isCancelled()) {
                return;
            }
            LocalDateTime customStart = exception.getNewStartTime() != null ? exception.getNewStartTime() : occStart;
            LocalDateTime customEnd = exception.getNewEndTime() != null ? exception.getNewEndTime() : occEnd;
            String customTitle = exception.getNewTitle() != null ? exception.getNewTitle() : task.getTitle();
            String customDescription = exception.getNewDescription() != null ? exception.getNewDescription() : task.getDescription();

            if (customEnd.isAfter(windowStart) && customStart.isBefore(windowEnd)){
                result.add(toDTO(task,customStart,customEnd,categories,customTitle,customDescription));
            }
            return;
        }

        if(occEnd.isAfter(windowStart)){
            result.add(toDTO(task,occStart,occEnd,categories,task.getTitle(),task.getDescription()));
        }


    }


    private EventResponseDTO toDTO(Task task, LocalDateTime start,
                                   LocalDateTime end, Set<CategoryResponseDTO> categories,
                                   String title, String description) {
        String occurrenceId = task.getTaskId()+"_"+start.toString();
        return new EventResponseDTO(
                occurrenceId,
                task.getTaskId(),
                title,
                description,
                start,
                end,
                task.isFlexible(),
                categories,
                task.isPrivate(),
                task.getRecurrenceType(),
                task.getRecurrenceEndDate(),
                task.getRecurrenceInterval(),
                task.getRecurrenceDays()
        );
    }

}
