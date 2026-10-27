package com.aa.calendar.dto.Auth;

public record LoginRequest(
        String username,
        String password
) {
}
