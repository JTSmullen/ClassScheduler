package com.classScheduler.app.auth.service;

import com.classScheduler.app.user.entities.User;
import com.classScheduler.app.user.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

public class AuthService {

    PasswordEncoder passwordEncoder;
    UserRepository userRepository;

    @Transactional
    public User registerUser(String username, String password) {

        User user = new User();
        user.setName(username);
        user.setPasswordHash(passwordEncoder.encode(password));

        userRepository.save(user);

        return user;

    }

}
