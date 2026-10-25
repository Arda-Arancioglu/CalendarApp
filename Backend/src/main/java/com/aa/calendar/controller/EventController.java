package com.aa.calendar.controller;

import com.aa.calendar.dto.*;

import com.aa.calendar.service.EventService;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequestMapping("/api/events")
public class EventController {

    private final EventService service;

    public EventController(EventService service) {
        this.service = service;
    }


    @PostMapping
    public ResponseEntity<EventResponseDTO> create(@Valid @RequestBody EventRequestDTO request
            ,Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        EventResponseDTO created = service.create(request,userId);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }


    @GetMapping("/{id}")
    public ResponseEntity<EventResponseDTO> getById(@PathVariable Long id ,Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(service.getByID(userId,id));
    }

    @GetMapping
    public ResponseEntity<List<EventResponseDTO>> getEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime end,
            Authentication auth
            ) {
        Long userId = (Long) auth.getPrincipal();

        if (start == null && end == null) {
            return ResponseEntity.ok(service.getAll(userId));
        }
        return ResponseEntity.ok(service.getEventsInRange(userId, start, end));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<EventResponseDTO> deleteById(@PathVariable Long id,Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(service.deleteByID(userId , id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventResponseDTO> updateById(@PathVariable Long id,
                                                       @Valid @RequestBody EventRequestDTO request,
                                                       Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(service.updateByID(id,request,userId));
    }


    @DeleteMapping("/{id}/scope")
    public ResponseEntity<Void> deleteWithScope(@PathVariable Long id,
                                                @Valid @RequestBody EventScopeRequestDTO request,
                                                Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        service.deleteWithScope(id,request,userId);
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}/scope")
    public ResponseEntity<Void> updateWithScope(@PathVariable Long id,
                                                @Valid @RequestBody EventScopeRequestDTO request,
                                                Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        service.updateWithScope(id,request,userId);
        return ResponseEntity.noContent().build();
    }

}
