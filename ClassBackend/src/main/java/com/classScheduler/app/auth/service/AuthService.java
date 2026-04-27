package com.classScheduler.app.auth.service;

import com.classScheduler.app.auth.dto.LoginRequest;
import com.classScheduler.app.auth.dto.LoginResponse;
import com.classScheduler.app.auth.dto.RegisterRequest;
import com.classScheduler.app.exception.customs.UserAlreadyExistsException;
import com.classScheduler.app.user.entities.Role;
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
    public LoginResponse registerUser(RegisterRequest registerRequest) {

        if (userRepository.existsByName(registerRequest.getUsername())) {
            throw new UserAlreadyExistsException("Account with username already exists!");
        }

        if (userRepository.existsByEmail(registerRequest.getEmail())) {
            throw new UserAlreadyExistsException("Account with that email already exists!");
        }

        User user = new User();
        user.setName(registerRequest.getUsername());
        user.setPasswordHash(passwordEncoder.encode(registerRequest.getPassword()));
        user.setFirstName(registerRequest.getFirstName());
        user.setLastName(registerRequest.getLastName());
        user.setEmail(registerRequest.getEmail());
        if (registerRequest.isAdmin()) {
            user.setRole(Role.ADMIN);
        }
        else {
            user.setRole(Role.USER);
        }

        userRepository.save(user);

        return loginUser(new LoginRequest(registerRequest.getUsername(), registerRequest.getPassword()));

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
