package com.aa.calendar.controller;

import com.aa.calendar.dto.EventRequestDTO;
import com.aa.calendar.dto.EventResponseDTO;
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

    @RequestMapping("/FatMaN")
    @PostMapping
    public ResponseEntity<EventResponseDTO> create(@Valid @RequestBody EventRequestDTO request) {
        EventResponseDTO created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

//    @GetMapping
//    public ResponseEntity<List<EventResponseDTO>> getAll() {
//        return ResponseEntity.ok(service.getAll());
//    }
// old get all function


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
}
