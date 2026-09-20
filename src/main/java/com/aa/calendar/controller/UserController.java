package com.aa.calendar.controller;

import com.aa.calendar.dto.UserRequestDTO;
import com.aa.calendar.dto.UserResponseDTO;
import com.aa.calendar.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {this.service = service;}

    @PostMapping
//    @ResponseStatus(HttpStatus.CREATED)
    public ResponseEntity<UserResponseDTO> createUser(@Valid @RequestBody UserRequestDTO dto) {
       UserResponseDTO response = service.createUser(dto);
       return ResponseEntity.status(HttpStatus.CREATED).body(response);
//       return service.createUser(dto);
    }



}
