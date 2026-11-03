package com.aa.calendar.service;

import com.aa.calendar.dto.Routine.RoutineItemDTO;
import com.aa.calendar.dto.Routine.RoutineOccurrenceDTO;
import com.aa.calendar.dto.Routine.RoutineRequestDTO;
import com.aa.calendar.dto.Routine.RoutineResponseDTO;
import com.aa.calendar.entity.Routine;
import com.aa.calendar.entity.RoutineItem;
import com.aa.calendar.entity.User;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.repository.RoutineRepository;
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
                mapToDtoItem(routine)
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
            for(LocalDate current = fromDate ; !current.isAfter(endDate); current = current.plusDays(1)){
                if(current.isBefore(routine.getStartDate())){
                    continue;
                }
                if(routine.getEndDate()!= null && current.isAfter(routine.getEndDate())){
                    continue;
                }
                long daysBetween = ChronoUnit.DAYS.between(routine.getStartDate(),current);

                int cycleDayIndex = (int) Math.floorMod(daysBetween,routine.getCycleLength());

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




}
