package com.aa.calendar.service;

import com.aa.calendar.dto.AuthResponse;
import com.aa.calendar.dto.LoginRequest;
import com.aa.calendar.dto.RegisterRequest;
import com.aa.calendar.entity.User;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.repository.UserRepository;
import com.aa.calendar.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuthService {


    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final UserService userService;

    public AuthResponse register(RegisterRequest request) {
        User savedUser = userService.registerUser(request);

        String jwtToken = jwtService.generateToken(savedUser.getUserId(),savedUser.getUsername());

        return new AuthResponse(jwtToken,savedUser.getUserId(), savedUser.getUsername());
    }

    public AuthResponse login (LoginRequest req) {
        if(req.username()==null || req.password()==null){
            throw new BadRequestException("Username and password are mandatory");
        }
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            req.username().trim(),
                            req.password())

            );

        }catch (BadCredentialsException e){
            throw new BadRequestException("Invalid username and password");
        }

        User user = userRepository.findByUsername(req.username().trim())
                .orElseThrow(()->new BadRequestException("Invalid username or password"));

        String jwtToken = jwtService.generateToken(user.getUserId(),user.getUsername());
        return new AuthResponse(jwtToken,user.getUserId(), user.getUsername());
    }






}
