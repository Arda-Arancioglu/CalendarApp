package com.aa.calendar.controller;

import com.aa.calendar.dto.*;
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
    public ResponseEntity<List<SquadSummaryResponseDTO>> findAllSquads(Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(squadService.getAllSquads(userId));
    }
    @GetMapping("/{id}")
    public ResponseEntity<SquadDetailResponseDTO> findSquadById(@PathVariable Long id, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(squadService.getSquad(userId,id));
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


    @DeleteMapping("/{id}/leave")
    public ResponseEntity<Void> leaveSquad(@PathVariable Long id, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        squadService.leaveSquad(userId,id);
        return ResponseEntity.noContent().build();

    }



    @DeleteMapping("/{id}/kick")
    public ResponseEntity<Void> kickMember(@PathVariable Long id, @Valid @RequestBody SquadKickRequestDTO kick, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        squadService.kickFromSquad(kick, userId ,id);
        return ResponseEntity.noContent().build();

    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSquad(@PathVariable Long id, Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        squadService.deleteSquad(userId,id);
        return ResponseEntity.noContent().build();
    }

}
