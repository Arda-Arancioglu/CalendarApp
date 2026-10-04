package com.aa.calendar.controller;

import com.aa.calendar.dto.SquadCreateRequestDTO;
import com.aa.calendar.dto.SquadJoinRequestDTO;
import com.aa.calendar.dto.SquadResponseDTO;
import com.aa.calendar.service.SquadService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;

import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/squad")
public class SquadController {

    private final SquadService squadService;

    public SquadController(SquadService squadService) {
        this.squadService = squadService;
    }

    @GetMapping
    public ResponseEntity<List<SquadResponseDTO>> findAllSquads(Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();

        return ResponseEntity.ok(squadService.getAllSquads(userId));
    }

    @PostMapping
    public ResponseEntity<SquadResponseDTO> createSquad (@Valid @RequestBody SquadCreateRequestDTO dto, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        SquadResponseDTO response = squadService.createSquad(dto,userId);
       return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/join")
    public ResponseEntity<SquadResponseDTO> joinSquad(@Valid @RequestBody SquadJoinRequestDTO dto, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        SquadResponseDTO response = squadService.joinSquad(dto,userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }



}
