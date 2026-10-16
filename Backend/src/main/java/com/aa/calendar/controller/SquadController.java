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

    @GetMapping("/calendar")
    public ResponseEntity<List<SquadCalendarResponseDTO>> getAllSquadCalendar(@Valid @RequestBody SquadCalendarRequestDTO dto ,Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(squadService.getSquadCalendar(dto,userId));
    }

    @PutMapping("/visibility")
    public ResponseEntity<Void> updateVisibility(@Valid @RequestBody UpdateVisibilityRequestDTO dto , Authentication authentication){
            Long userId = (Long) authentication.getPrincipal();
            squadService.updateMemberVisibility(dto,userId);
            return  ResponseEntity.noContent().build();

    }

    @PutMapping("/role")
    public ResponseEntity<Void> updateRole(@Valid @RequestBody UpdateRoleRequestDTO dto , Authentication authentication){
        Long userId = (Long) authentication.getPrincipal();
        squadService.updateMemberRole(dto,userId);
        return  ResponseEntity.noContent().build();
    }

}
