package com.classScheduler.app.recommendation.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class RecommendationOptionsDTO {

    private List<ProgramSheetOptionDTO> programSheets;
    private List<String> semesters;
}