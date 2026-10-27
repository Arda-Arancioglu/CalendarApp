package com.aa.calendar.dto.Auth;

public record AuthResponse(
        String token,
        Long userId,
        String username
) {
}
