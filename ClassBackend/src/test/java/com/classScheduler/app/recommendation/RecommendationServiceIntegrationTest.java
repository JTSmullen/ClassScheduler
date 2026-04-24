package com.classScheduler.app.recommendation;

import com.classScheduler.app.program.entity.ProgramSheet;
import com.classScheduler.app.program.repository.ProgramSheetRepository;
import com.classScheduler.app.recommendation.dto.RecommendationOptionsDTO;
import com.classScheduler.app.recommendation.dto.RecommendationRequestDTO;
import com.classScheduler.app.recommendation.dto.RecommendationResponseDTO;
import com.classScheduler.app.recommendation.service.RecommendationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
class RecommendationServiceIntegrationTest {

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private ProgramSheetRepository programSheetRepository;

    @Test
    void recommendsCoursesForAnAvailableProgramSheetSemester() throws Exception {
        ProgramSheet programSheet = programSheetRepository.findByProgramCode("gcc-bs-physics-computer-software-2025")
                .orElseThrow();

        RecommendationOptionsDTO options = recommendationService.getOptions();
        String selectedSemester = options.getSemesters().stream()
            .filter(label -> label.equals("Junior Fall"))
            .findFirst()
            .orElse("Junior Fall");

        RecommendationRequestDTO request = new RecommendationRequestDTO();
        request.setProgramCode(programSheet.getProgramCode());
        request.setSemester(selectedSemester);
        request.setCompletedCourses(List.of());

        RecommendationResponseDTO response = recommendationService.recommendCourses(request);

        assertNotNull(response);
        assertEquals(request.getProgramCode(), response.getProgramCode());
        assertEquals(request.getSemester(), response.getSemester());
        assertNotNull(response.getRecommendations());
        assertNotNull(response.getPlanningNotes());
        assertNotNull(response.getBlockingIssues());
    }
}