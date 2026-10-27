package com.aa.calendar.controller;

import com.aa.calendar.dto.User.ThemeUpdateRequestDTO;
import com.aa.calendar.dto.User.UserResponseDTO;
import com.aa.calendar.service.UserService;

import jakarta.validation.Valid;
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

    @PutMapping("/theme")
    public ResponseEntity<UserResponseDTO> updateTheme(@RequestBody @Valid ThemeUpdateRequestDTO themeUpdateRequestDTO,
                                                       Authentication authentication) {
        Long userId = (Long) authentication.getPrincipal();
        return ResponseEntity.ok(service.updateTheme(userId, themeUpdateRequestDTO));
    }


}
