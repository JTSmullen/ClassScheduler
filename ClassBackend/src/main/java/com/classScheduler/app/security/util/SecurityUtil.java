package com.classScheduler.app.security.util;

import com.classScheduler.app.security.principal.CustomUserDetails;
import com.classScheduler.app.user.entities.User;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class SecurityUtil {

    public Optional<User> getCurrentUser() {

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !authentication.isAuthenticated()) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();

        if (principal instanceof CustomUserDetails) {
            User user = ((CustomUserDetails) principal).user();
            return Optional.of(user);
        }

        return Optional.empty();

    }

}
