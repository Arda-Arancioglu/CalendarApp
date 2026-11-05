package com.aa.calendar.service;

import com.aa.calendar.dto.Routine.*;
import com.aa.calendar.entity.Routine;
import com.aa.calendar.entity.RoutineItem;
import com.aa.calendar.entity.RoutineShift;
import com.aa.calendar.entity.User;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.repository.RoutineRepository;
import com.aa.calendar.repository.RoutineShiftRepository;
import com.aa.calendar.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class RoutineService {


    private final UserRepository userRepository;
    private final RoutineRepository routineRepository;
    private final RoutineShiftRepository routineShiftRepository;


    //create routine
    @Transactional
    public RoutineResponseDTO createRoutine(Long userId, RoutineRequestDTO dto){
       User user = userRepository.findById(userId)
                .orElseThrow(()-> new BadRequestException("User couldn't be found"));

       Routine routine = new Routine();

       routine.setTitle(dto.title());
       routine.setDescription(dto.description());
       routine.setCycleLength(dto.cycleLength());
       routine.setStartDate(dto.startDate());
       routine.setEndDate(dto.endDate());
       routine.setColor(dto.color());
       routine.setUser(user);

       for (RoutineItemDTO itemDto :dto.items()){
            RoutineItem item = new RoutineItem();
            item.setDayIndex(itemDto.dayIndex());
            item.setTitle(itemDto.title());
            item.setDescription(itemDto.description());
            item.setStartTime(itemDto.startTime());
            item.setEndTime(itemDto.endTime());
            item.setRestDay(itemDto.isRestDay());
            item.setRoutine(routine);
            routine.getItems().add(item);
       }
        routineRepository.save(routine);

       return mapToDtoRoutine(routine);
    }

    private RoutineResponseDTO mapToDtoRoutine(Routine routine){
        return new RoutineResponseDTO(
                routine.getRoutineId(),
                routine.getTitle(),
                routine.getDescription(),
                routine.getCycleLength(),
                routine.getStartDate(),
                routine.getEndDate(),
                routine.getColor(),
                mapToDtoItem(routine),
                routine.isActive()
        );
    }
    private List<RoutineItemDTO> mapToDtoItem(Routine routine){
        List<RoutineItemDTO> myList = new ArrayList<>();
        for (RoutineItem item : routine.getItems()){
            RoutineItemDTO dto = new RoutineItemDTO(
                    item.getDayIndex(),
                    item.getTitle(),
                    item.getDescription(),
                    item.getStartTime(),
                    item.getEndTime(),
                    item.isRestDay()
            );
            myList.add(dto);
        }
        return myList;
    }

    //get user routines
    @Transactional
    public List<RoutineResponseDTO> getUserRoutines(Long userId){
        if(!userRepository.existsById(userId)){
            throw new  BadRequestException("User not found with id" + userId);
        }
        List<Routine> routines = routineRepository.findByUser_UserId(userId).stream().toList();
        List<RoutineResponseDTO> response = new ArrayList<>();
        for(Routine routine:routines){
            response.add(mapToDtoRoutine(routine));
        }
        return response;
    }

    //get routine occurrences
    @Transactional
    public List<RoutineOccurrenceDTO> getRoutineOccurrence(Long userId , LocalDate fromDate, LocalDate endDate){
        if(!userRepository.existsById(userId)){
            throw new BadRequestException("User not found with id "+ userId);
        }
        List<Routine> routines = routineRepository.findByUser_UserId(userId).stream().toList();
        List<RoutineOccurrenceDTO> response = new ArrayList<>();
        for(Routine routine: routines){
            if(routine.getItems().isEmpty() || routine.getCycleLength() <=0){
                continue;
            }
            Map<Integer,RoutineItem> itemMap = new HashMap<>();
            for(RoutineItem item : routine.getItems()){
                itemMap.put(item.getDayIndex(),item);
            }
            List<RoutineShift> shifts = routineShiftRepository
                    .findByRoutine_RoutineIdOrderByShiftDateAsc(routine.getRoutineId());
            for(LocalDate current = fromDate ; !current.isAfter(endDate); current = current.plusDays(1)){
                if(current.isBefore(routine.getStartDate())){
                    continue;
                }
                if(routine.getEndDate()!= null && current.isAfter(routine.getEndDate())){
                    continue;
                }
                int totalShift= 0;
                boolean isSkippedDay =false;
                for(RoutineShift s: shifts){
                    LocalDate shiftEndExclusive = s.getShiftDate().plusDays((s.getShiftDays()));
                    if(!current.isBefore(s.getShiftDate())  && current.isBefore(shiftEndExclusive) ){
                        isSkippedDay=true;
                        break;
                    }
                    if(!current.isBefore(s.getShiftDate())){
                        totalShift+=s.getShiftDays();
                    }
                }
                if(isSkippedDay){
                    continue;
                }
                long daysBetween = ChronoUnit.DAYS.between(routine.getStartDate(),current);

                long effectiveDay = daysBetween - totalShift;

                int cycleDayIndex = (int) Math.floorMod(effectiveDay,routine.getCycleLength());

                RoutineItem item = itemMap.get(cycleDayIndex);

                if(item!=null && !item.isRestDay()){
                    RoutineOccurrenceDTO dto = new RoutineOccurrenceDTO(
                        routine.getRoutineId(),
                        item.getRoutineItemId(),
                        item.getTitle(),
                        item.getDescription(),
                        current,
                        item.getStartTime(),
                        item.getEndTime(),
                        routine.getColor(),
                        item.getDayIndex(),
                        item.isRestDay()

                        );
                    response.add(dto);
                }



            }


        }


        return response;
    }


    // shift routine
    @Transactional
    public void shiftRoutine(Long userId, Long routineId , RoutineShiftRequestDTO dto){
        Routine routine = routineRepository.findById(routineId)
                .orElseThrow(()-> new BadRequestException("Routine not found with id"+ routineId));

        if(!routine.getUser().getUserId().equals(userId)){
            throw new BadRequestException("You do NOT have permission to shift this routine");
        }

        if (dto.shiftDays() <= 0){
            throw new BadRequestException("Shift days must be greater than or equal to 1");
        }

        RoutineShift shift = new RoutineShift();

        shift.setRoutine(routine);
        shift.setShiftDate(dto.shiftDate());
        shift.setShiftDays(dto.shiftDays());
        routineShiftRepository.save(shift);

        if(dto.extendEndDate() && routine.getEndDate() != null){
            routine.setEndDate(routine.getEndDate().plusDays(dto.shiftDays()));
            routineRepository.save(routine);
        }


    }

    @Transactional
    public void deleteRoutine(Long userId, Long routineId){
        Routine routine = routineRepository.findByUser_UserIdAndRoutineId(userId,routineId)
                .orElseThrow(()-> new BadRequestException("User doesn't have the routine"));
       routineShiftRepository.deleteByRoutine_RoutineId(routineId);
       routineRepository.delete(routine);
    }

    @Transactional
    public  RoutineResponseDTO deactivateRoutine(Long userId, Long routineId, LocalDate stopDate){
        Routine routine = routineRepository.findByUser_UserIdAndRoutineId(userId,routineId)
                .orElseThrow(()-> new BadRequestException("User doesn't have the routine"));
        routine.setActive(false);
        routine.setEndDate(stopDate!=null ? stopDate : LocalDate.now());
        routineRepository.save(routine);
        return mapToDtoRoutine(routine);

    }

    @Transactional
    public  RoutineResponseDTO activateRoutine(Long userId, Long routineId, LocalDate activateDate , LocalDate newEndDate){
        Routine routine = routineRepository.findByUser_UserIdAndRoutineId(userId,routineId)
                .orElseThrow(()-> new BadRequestException("User doesn't have the routine"));
        LocalDate startAgain = (activateDate !=null) ? activateDate : LocalDate.now();

        if(routine.getEndDate() != null && routine.getEndDate().isBefore(startAgain)){
            long gapDays = ChronoUnit.DAYS.between(routine.getEndDate().plusDays(1),startAgain);
            if (gapDays>0){
                RoutineShift shift = new RoutineShift();
                shift.setRoutine(routine);
                shift.setShiftDate(routine.getEndDate().plusDays(1));
                shift.setShiftDays((int)gapDays);
                routineShiftRepository.save(shift);
            }
        }
        routine.setActive(true);
        routine.setEndDate(newEndDate);
        routineRepository.save(routine);

        return mapToDtoRoutine(routine);
    }

}
