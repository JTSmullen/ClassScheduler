package com.classScheduler.app.user.controller;

import com.classScheduler.app.user.dto.BaseUserDTO;
import com.classScheduler.app.user.service.UserService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/user")
public class UserController {

    private final UserService userService;

    public UserController(UserService userService){
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<BaseUserDTO> getUserInfo() {

        BaseUserDTO user = userService.loadUserInfo();
        return ResponseEntity.ok(user);

    }

}
