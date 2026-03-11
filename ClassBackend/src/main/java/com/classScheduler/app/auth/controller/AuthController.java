package com.classScheduler.app.auth.controller;

import com.classScheduler.app.auth.dto.LoginRequest;
import com.classScheduler.app.auth.dto.LoginResponse;
import com.classScheduler.app.auth.dto.RegisterRequest;
import com.classScheduler.app.auth.service.AuthService;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/register")
    public ResponseEntity<LoginResponse> registerUser(@Valid @RequestBody RegisterRequest registerRequest) {

        LoginResponse loginResponse = authService.registerUser(registerRequest);
        return ResponseEntity.ok(loginResponse);

    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody LoginRequest loginRequest) {

        LoginResponse loginResponse = authService.loginUser(loginRequest);
        return ResponseEntity.ok(loginResponse);

    }
}
