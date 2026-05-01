package com.classScheduler.app.auth.dto;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RegisterRequest {

    private String username;
    private String password;
    private String firstName;
    private String lastName;
    private String email;
    private boolean admin;
}
