package com.aa.calendar.controller;

import com.aa.calendar.dto.Routine.RoutineRequestDTO;
import com.aa.calendar.dto.Routine.RoutineResponseDTO;
import com.aa.calendar.service.RoutineService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

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


}
