package com.classScheduler.app.recommendation.service;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseSectionRepository;
import com.classScheduler.app.program.entity.ProgramSheet;
import com.classScheduler.app.program.repository.ProgramSheetRepository;
import com.classScheduler.app.recommendation.dto.ProgramSheetOptionDTO;
import com.classScheduler.app.recommendation.dto.RecommendationOptionsDTO;
import com.classScheduler.app.recommendation.dto.RecommendationRequestDTO;
import com.classScheduler.app.recommendation.dto.RecommendationResponseDTO;
import com.classScheduler.app.recommendation.dto.RecommendedCourseDTO;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class RecommendationService {

    private static final int MAX_RECOMMENDATIONS = 8;
    private static final int MAX_UNAVAILABLE_CODES = 8;
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("^([A-Z]+)\\s*(\\d+[A-Z]?)$");

    private final ProgramSheetRepository programSheetRepository;
    private final CourseSectionRepository courseSectionRepository;
    private final ObjectMapper objectMapper;

    public RecommendationService(
            ProgramSheetRepository programSheetRepository,
            CourseSectionRepository courseSectionRepository,
            ObjectMapper objectMapper
    ) {
        this.programSheetRepository = programSheetRepository;
        this.courseSectionRepository = courseSectionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public RecommendationOptionsDTO getOptions() {
        List<ProgramSheetOptionDTO> programSheets = programSheetRepository.findAll().stream()
                .sorted(Comparator.comparing(ProgramSheet::getProgramTitle)
                        .thenComparingInt(ProgramSheet::getEntryYear))
                .map(sheet -> new ProgramSheetOptionDTO(
                        sheet.getProgramCode(),
                        "%s (%d)".formatted(sheet.getProgramTitle(), sheet.getEntryYear())
                ))
                .toList();

        List<String> semesters = courseSectionRepository.findDistinctSemesters();
        return new RecommendationOptionsDTO(programSheets, semesters);
    }

    @Transactional(readOnly = true)
    public RecommendationResponseDTO recommendCourses(RecommendationRequestDTO request) {
        ProgramSheet programSheet = programSheetRepository.findByProgramCode(request.getProgramCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Program sheet not found"));

        JsonNode root = readProgramSheet(programSheet);
        Set<String> completedCourses = normalizeCompletedCourses(request.getCompletedCourses());
        List<ProgramCourseCandidate> candidates = extractCandidates(root);

        LinkedHashMap<String, RecommendedCourseDTO> recommendations = new LinkedHashMap<>();
        LinkedHashSet<String> unavailableCourseCodes = new LinkedHashSet<>();

        for (ProgramCourseCandidate candidate : candidates) {
            String courseCode = buildCourseCode(candidate.subject(), candidate.number());

            if (completedCourses.contains(courseCode) || recommendations.containsKey(courseCode)) {
                continue;
            }

            List<CourseSection> matchingSections = courseSectionRepository.findBySubjectIgnoreCaseAndNumberAndSemester(
                    candidate.subject(),
                    candidate.number(),
                    request.getSemester()
            );

            if (matchingSections.isEmpty()) {
                if (unavailableCourseCodes.size() < MAX_UNAVAILABLE_CODES) {
                    unavailableCourseCodes.add(courseCode);
                }
                continue;
            }

            CourseSection selectedSection = choosePreferredSection(matchingSections);
            recommendations.put(courseCode, new RecommendedCourseDTO(
                    courseCode,
                    candidate.courseTitle(),
                    candidate.requirementCategory(),
                    candidate.recommendationType(),
                    toDto(selectedSection)
            ));

            if (recommendations.size() >= MAX_RECOMMENDATIONS) {
                break;
            }
        }

        return new RecommendationResponseDTO(
                programSheet.getProgramCode(),
                request.getSemester(),
                normalizeCompletedCourseList(request.getCompletedCourses()),
                new ArrayList<>(recommendations.values()),
                new ArrayList<>(unavailableCourseCodes)
        );
    }

    private JsonNode readProgramSheet(ProgramSheet programSheet) {
        try {
            return objectMapper.readTree(programSheet.getProgramDataJson());
        } catch (JsonProcessingException error) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Program sheet data could not be read", error);
        }
    }

    private List<ProgramCourseCandidate> extractCandidates(JsonNode root) {
        List<ProgramCourseCandidate> candidates = new ArrayList<>();

        for (JsonNode category : root.path("requirementCategories")) {
            String requirementCategory = category.path("title").asText("Program requirement");

            appendCourseNodes(candidates, category.path("courses"), requirementCategory, "required");
            appendCourseNodes(candidates, category.path("selection").path("from"), requirementCategory, "choice");
        }

        return candidates;
    }

    private void appendCourseNodes(
            List<ProgramCourseCandidate> candidates,
            JsonNode courseNodes,
            String requirementCategory,
            String recommendationType
    ) {
        if (!courseNodes.isArray()) {
            return;
        }

        for (JsonNode courseNode : courseNodes) {
            String subject = courseNode.path("subject").asText("").trim();

            if (!StringUtils.hasText(subject) || !courseNode.path("number").canConvertToInt()) {
                continue;
            }

            candidates.add(new ProgramCourseCandidate(
                    subject.toUpperCase(Locale.ROOT),
                    courseNode.path("number").asInt(),
                    courseNode.path("title").asText(buildCourseCode(subject, courseNode.path("number").asInt())),
                    requirementCategory,
                    recommendationType
            ));
        }
    }

    private Set<String> normalizeCompletedCourses(List<String> completedCourses) {
        return new LinkedHashSet<>(normalizeCompletedCourseList(completedCourses));
    }

    private List<String> normalizeCompletedCourseList(List<String> completedCourses) {
        return Optional.ofNullable(completedCourses)
                .orElseGet(List::of)
                .stream()
                .map(this::normalizeCourseCode)
                .filter(StringUtils::hasText)
                .distinct()
                .toList();
    }

    private String normalizeCourseCode(String value) {
        if (!StringUtils.hasText(value)) {
            return "";
        }

        String compact = value.trim().toUpperCase(Locale.ROOT)
                .replaceAll("[^A-Z0-9]+", " ")
                .trim();

        Matcher matcher = COURSE_CODE_PATTERN.matcher(compact.replace(" ", ""));

        if (matcher.matches()) {
            return "%s %s".formatted(matcher.group(1), matcher.group(2));
        }

        matcher = COURSE_CODE_PATTERN.matcher(compact);
        if (matcher.matches()) {
            return "%s %s".formatted(matcher.group(1), matcher.group(2));
        }

        return compact;
    }

    private String buildCourseCode(String subject, int number) {
        return "%s %d".formatted(subject.toUpperCase(Locale.ROOT), number);
    }

    private CourseSection choosePreferredSection(List<CourseSection> sections) {
        return sections.stream()
                .sorted(Comparator
                        .comparing((CourseSection section) -> !section.isOpen())
                        .thenComparing(Comparator.comparingInt(CourseSection::getOpenSeats).reversed())
                        .thenComparing(section -> section.getSection() == null ? "" : section.getSection()))
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No matching course section found"));
    }

    private CourseSectionDTO toDto(CourseSection section) {
        return new CourseSectionDTO(
                section.getId(),
                section.getSubject(),
                section.getNumber(),
                section.getName(),
                section.getCredits(),
                section.isLab(),
                section.isOpen(),
                section.getLocation(),
                section.getSection(),
                section.getSemester(),
                section.getOpenSeats(),
                section.getTotalSeats(),
                section.getFaculty(),
                section.getTimes()
        );
    }

    private record ProgramCourseCandidate(
            String subject,
            int number,
            String courseTitle,
            String requirementCategory,
            String recommendationType
    ) {
    }
}