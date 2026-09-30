package com.aa.calendar.controller;

import com.aa.calendar.dto.AuthResponse;
import com.aa.calendar.dto.RegisterRequest;
import com.aa.calendar.dto.UserRequestDTO;
import com.aa.calendar.dto.UserResponseDTO;
import com.aa.calendar.entity.User;
import com.aa.calendar.service.UserService;
import jakarta.validation.Valid;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/user")
public class UserController {

    private final UserService service;

    public UserController(UserService service) {this.service = service;}

    @GetMapping("/me")
    public ResponseEntity<UserResponseDTO> getCurrentUser(Authentication authentication) {
        // authentication.getPrincipal() holds the userId set by JwtAuthenticationFilter
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(service.getUserById(userId));
    }
}
