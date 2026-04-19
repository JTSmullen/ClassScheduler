package com.classScheduler.app.recommendation;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseSectionRepository;
import com.classScheduler.app.program.entity.ProgramSheet;
import com.classScheduler.app.program.repository.ProgramSheetRepository;
import com.classScheduler.app.recommendation.dto.RecommendationRequestDTO;
import com.classScheduler.app.recommendation.dto.RecommendationResponseDTO;
import com.classScheduler.app.recommendation.service.RecommendationService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
class RecommendationServiceIntegrationTest {

    @Autowired
    private RecommendationService recommendationService;

    @Autowired
    private ProgramSheetRepository programSheetRepository;

    @Autowired
    private CourseSectionRepository courseSectionRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void recommendsCoursesForAnAvailableProgramSheetSemester() throws Exception {
        ProgramSheet programSheet = programSheetRepository.findByProgramCode("gcc-bs-physics-computer-software-2025")
                .orElseThrow();

        JsonNode root = objectMapper.readTree(programSheet.getProgramDataJson());
        Optional<CourseSection> matchingSection = findFirstSectionThatExistsInCatalog(root);

        assertFalse(matchingSection.isEmpty());

        RecommendationRequestDTO request = new RecommendationRequestDTO();
        request.setProgramCode(programSheet.getProgramCode());
        request.setSemester(matchingSection.orElseThrow().getSemester());
        request.setCompletedCourses(List.of());

        RecommendationResponseDTO response = recommendationService.recommendCourses(request);

        assertNotNull(response);
        assertEquals(request.getProgramCode(), response.getProgramCode());
        assertEquals(request.getSemester(), response.getSemester());
        assertFalse(response.getRecommendations().isEmpty());
        response.getRecommendations().forEach(recommendation ->
                assertEquals(request.getSemester(), recommendation.getSection().getSemester()));
    }

    private Optional<CourseSection> findFirstSectionThatExistsInCatalog(JsonNode root) {
        List<JsonNode> candidateNodes = new ArrayList<>();

        root.path("requirementCategories").forEach(category -> {
            category.path("courses").forEach(candidateNodes::add);
            category.path("selection").path("from").forEach(candidateNodes::add);
        });

        return candidateNodes.stream()
                .filter(node -> node.path("subject").isTextual() && node.path("number").canConvertToInt())
                .map(node -> courseSectionRepository.findBySubjectIgnoreCaseAndNumber(
                        node.path("subject").asText(),
                        node.path("number").asInt()
                ))
                .filter(sections -> !sections.isEmpty())
                .map(sections -> sections.getFirst())
                .findFirst();
    }
}