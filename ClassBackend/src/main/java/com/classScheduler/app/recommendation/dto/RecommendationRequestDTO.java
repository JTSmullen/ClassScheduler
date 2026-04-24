package com.classScheduler.app.recommendation.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class RecommendationRequestDTO {

    @NotBlank(message = "programCode is required")
    private String programCode;

    @NotBlank(message = "semester is required")
    private String semester;

    private List<String> completedCourses = new ArrayList<>();
}