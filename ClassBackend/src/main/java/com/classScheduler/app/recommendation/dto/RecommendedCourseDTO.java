package com.classScheduler.app.recommendation.dto;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class RecommendedCourseDTO {

    private String courseCode;
    private String courseTitle;
    private String requirementCategory;
    private String recommendationType;
    private CourseSectionDTO section;
}