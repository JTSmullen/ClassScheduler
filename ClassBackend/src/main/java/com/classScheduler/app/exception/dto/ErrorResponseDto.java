package com.classScheduler.app.exception.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.Getter;
import lombok.Setter;

@Data
@Getter
@Setter
@AllArgsConstructor
public class ErrorResponseDto {

    private String message;
    private int status;

}
