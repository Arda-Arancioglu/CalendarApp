package com.aa.calendar.controller;

import com.aa.calendar.dto.Routine.RoutineOccurrenceDTO;
import com.aa.calendar.dto.Routine.RoutineRequestDTO;
import com.aa.calendar.dto.Routine.RoutineResponseDTO;
import com.aa.calendar.dto.Routine.RoutineShiftRequestDTO;
import com.aa.calendar.service.RoutineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/routines")
@RequiredArgsConstructor
public class RoutineController {

    private final RoutineService routineService;

    @PostMapping
    public ResponseEntity<RoutineResponseDTO> createRoutine(Authentication authentication,
                                                           @Valid @RequestBody  RoutineRequestDTO dto){
        Long userId = (Long) authentication.getPrincipal();
        RoutineResponseDTO response = routineService.createRoutine(userId,dto);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);

    }

    @GetMapping
    public ResponseEntity<List<RoutineResponseDTO>> getRoutines(Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok().body(routineService.getUserRoutines(userId));
    }

    @GetMapping("/occurrences")
    public ResponseEntity<List<RoutineOccurrenceDTO>> getRoutineOccurrences(
            Authentication authentication,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate fromDate,
            @RequestParam @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate endDate){

        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok().body(routineService.getRoutineOccurrence(userId,fromDate,endDate));
    }

    @PostMapping("/{id}/shift")
    public ResponseEntity<Void> shiftRoutine(@PathVariable Long id,
                                             @Valid @RequestBody RoutineShiftRequestDTO dto,
                                             Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        routineService.shiftRoutine(userId,id,dto);
        return ResponseEntity.ok().build();
    }


    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRoutine(@PathVariable Long id,Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        routineService.deleteRoutine(userId,id);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/deactivate")
    public ResponseEntity<RoutineResponseDTO> deactivateRoutine(@PathVariable Long id ,
                                                                Authentication authentication,
                                                                @RequestParam(required = false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate stopDate){
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok().body(routineService.deactivateRoutine(userId,id,stopDate));
    }

    @PatchMapping("/{id}/activate")
    public ResponseEntity<RoutineResponseDTO> activateRoutine(@PathVariable Long id ,
                                                                Authentication authentication,
                                                                @RequestParam(required = false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate activateDate,
                                                              @RequestParam(required = false) @DateTimeFormat(iso=DateTimeFormat.ISO.DATE)LocalDate newEndDate){
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok().body(routineService.activateRoutine(userId,id,activateDate,newEndDate));
    }



}
