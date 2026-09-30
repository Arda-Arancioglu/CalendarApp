package com.aa.calendar.dto;

public record AuthResponse(
        String token,
        Long userId,
        String username
) {
}
