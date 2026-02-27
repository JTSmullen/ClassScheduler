package com.classScheduler.app.auth.service;

import com.classScheduler.app.auth.dto.LoginRequest;
import com.classScheduler.app.auth.dto.LoginResponse;
import com.classScheduler.app.auth.dto.RegisterRequest;
import com.classScheduler.app.user.entities.User;
import com.classScheduler.app.user.repository.UserRepository;
import com.classScheduler.app.security.util.JwtUtil;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.core.Authentication;

@Service
public class AuthService {

    PasswordEncoder passwordEncoder;
    UserRepository userRepository;
    JwtUtil jwtUtil;
    AuthenticationManager authenticationManager;

    public AuthService (PasswordEncoder passwordEncoder,
                        UserRepository userRepository,
                        JwtUtil jwtUtil,
                        AuthenticationManager authenticationManager){
        this.passwordEncoder = passwordEncoder;
        this.userRepository = userRepository;
        this.jwtUtil = jwtUtil;
        this.authenticationManager = authenticationManager;
    }

    @Transactional
    public User registerUser(RegisterRequest registerRequest) {

        User user = new User();
        user.setName(registerRequest.getUsername());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setEmail(registerRequest.getEmail());

        userRepository.save(user);

        return user;

    }

    public LoginResponse loginUser(LoginRequest loginRequest) {

        Authentication auth = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsername(), loginRequest.getPassword())
        );

        SecurityContextHolder.getContext().setAuthentication(auth);

        String jwt = jwtUtil.generateToken(auth.getName());

        return new LoginResponse(jwt, auth.getName());
    }

}
