package com.aa.calendar.service;

import com.aa.calendar.dto.Routine.RoutineItemDTO;
import com.aa.calendar.dto.Routine.RoutineRequestDTO;
import com.aa.calendar.dto.Routine.RoutineResponseDTO;
import com.aa.calendar.entity.Routine;
import com.aa.calendar.entity.RoutineItem;
import com.aa.calendar.entity.User;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.repository.RoutineRepository;
import com.aa.calendar.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoutineService {


    private final UserRepository userRepository;
    private final RoutineRepository routineRepository;


    //create routine
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

    //get routine occurrences

    // shift routine




}
