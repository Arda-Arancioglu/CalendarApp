package com.aa.calendar.security;


import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.NonNull;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;

   @Override
    protected void doFilterInternal(
          @NonNull HttpServletRequest request,
          @NonNull  HttpServletResponse response,
          @NonNull  FilterChain filterchain
    )throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if(authHeader==null|| !authHeader.startsWith("Bearer ")){
            filterchain.doFilter(request,response);
            return;
        }


        final String token = authHeader.substring(7);

        if (jwtService.isTokenValid(token)  && SecurityContextHolder.getContext().getAuthentication() == null ) {
            String username = jwtService.extractUsername(token);
            Long userId = jwtService.extractUserId(token);


            UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                    userId,
                    null,
                    Collections.emptyList()
            );

            authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

            SecurityContextHolder.getContext().setAuthentication(authToken);

        }

        filterchain.doFilter(request,response);

    }



}
