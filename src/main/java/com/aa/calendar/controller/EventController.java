package com.aa.calendar.controller;

import com.aa.calendar.dto.*;

import com.aa.calendar.service.EventService;

import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<EventResponseDTO> create(@Valid @RequestBody EventRequestDTO request ) {
        EventResponseDTO created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }


    @GetMapping("/{id}")
    public ResponseEntity<EventResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getByID(id));
    }
    @GetMapping
    public ResponseEntity<List<EventResponseDTO>> getEvents(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)LocalDateTime end
            ) {
        if (start == null && end == null) {
            return ResponseEntity.ok(service.getAll());
        }
        return ResponseEntity.ok(service.getEventsInRange(start, end));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<EventResponseDTO> deleteById(@PathVariable Long id) {
        return ResponseEntity.ok(service.deleteByID(id));
    }

    @DeleteMapping
    public ResponseEntity<Void> deleteEvents() {
        service.deleteEvents();
        return ResponseEntity.noContent().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<EventResponseDTO> updateById(@PathVariable Long id, @Valid @RequestBody EventRequestDTO request) {
        return ResponseEntity.ok(service.updateByID(id,request));
    }

    @PostMapping("{taskId}/assign/{userId}")
    public ResponseEntity<Void> assignTask(@PathVariable Long taskId, @PathVariable Long userId) {
        service.assignUserToTask(userId , taskId);
        return  ResponseEntity.noContent().build();
    }

    @GetMapping("/myCalendar/{userId}")
    public ResponseEntity<List<EventResponseDTO>> getMyCalendar(@PathVariable Long userId) {
        return ResponseEntity.ok(service.myCalendar(userId));
    }
}
