package com.classScheduler.app.recommendation.controller;

import com.classScheduler.app.recommendation.dto.RecommendationOptionsDTO;
import com.classScheduler.app.recommendation.dto.RecommendationRequestDTO;
import com.classScheduler.app.recommendation.dto.RecommendationResponseDTO;
import com.classScheduler.app.recommendation.service.RecommendationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/recommendations")
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/options")
    public ResponseEntity<RecommendationOptionsDTO> getOptions() {
        return ResponseEntity.ok(recommendationService.getOptions());
    }

    @PostMapping
    public ResponseEntity<RecommendationResponseDTO> recommendCourses(@Valid @RequestBody RecommendationRequestDTO request) {
        return ResponseEntity.ok(recommendationService.recommendCourses(request));
    }
}