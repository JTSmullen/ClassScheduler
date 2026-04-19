package com.classScheduler.app.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class RecommendationResponseDTO {

    private String programCode;
    private String semester;
    private List<String> completedCourses;
    private List<RecommendedCourseDTO> recommendations;
    private List<String> unavailableCourseCodes;
}