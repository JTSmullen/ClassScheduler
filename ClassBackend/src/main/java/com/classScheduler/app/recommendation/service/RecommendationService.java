package com.classScheduler.app.recommendation.service;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.ClassTime;
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
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class RecommendationService {

    private static final int MAX_RECOMMENDATIONS = 7;
    private static final int MAX_UNAVAILABLE_CODES = 16;
    private static final int MIN_TERM_CREDITS = 15;
    private static final int MAX_TERM_CREDITS = 18;
    private static final Pattern COURSE_CODE_PATTERN = Pattern.compile("^([A-Z]+)\\s*(\\d+[A-Z]?)$");
    private static final Pattern COURSE_TOKEN_PATTERN = Pattern.compile("([A-Z]{2,5})\\s*(\\d{2,3}[A-Z]?)");

    // Fixed four-year sequence requested by the user.
    private static final List<String> STANDARD_PLAN_SEMESTERS = List.of(
        "Freshman Fall",
        "Freshman Spring",
        "Sophomore Fall",
        "Sophomore Spring",
        "Junior Fall",
        "Junior Spring",
        "Senior Fall",
        "Senior Spring"
    );

    private static final Map<String, Integer> TERM_INDEX_BY_LABEL = Map.ofEntries(
        Map.entry("freshman fall", 0),
        Map.entry("freshman spring", 1),
        Map.entry("sophomore fall", 2),
        Map.entry("sophomore spring", 3),
        Map.entry("junior fall", 4),
        Map.entry("junior spring", 5),
        Map.entry("senior fall", 6),
        Map.entry("senior spring", 7)
    );

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
        // Options endpoint intentionally returns fixed 4-year semester labels so planning
        // logic can compare "before/after" terms without depending on catalog year strings.
        List<ProgramSheetOptionDTO> programSheets = programSheetRepository.findAll().stream()
                .sorted(Comparator.comparing(ProgramSheet::getProgramTitle)
                        .thenComparingInt(ProgramSheet::getEntryYear))
                .map(sheet -> new ProgramSheetOptionDTO(
                        sheet.getProgramCode(),
                        "%s (%d)".formatted(sheet.getProgramTitle(), sheet.getEntryYear())
                ))
                .toList();

        return new RecommendationOptionsDTO(programSheets, STANDARD_PLAN_SEMESTERS);
    }

    @Transactional(readOnly = true)
    public RecommendationResponseDTO recommendCourses(RecommendationRequestDTO request) {
        // Core high-level workflow (commented for future reference):
        // 1) Parse/normalize completed courses and selected semester.
        // 2) Build semester-by-semester sample plan from sampleFourYearPlan.
        // 3) Remove completed courses and find backlog from semesters before selected term.
        // 4) Try to place backlog into selected term by replacing electives first, then HUMA.
        // 5) If needed, push selected-term major courses forward (<= Senior Spring) to open space.
        // 6) Keep credits in the requested 15-18 range when possible.
        // 7) Resolve real catalog sections and avoid time conflicts.
        // 8) Return recommendations + notes explaining tradeoffs and blockers.
        ProgramSheet programSheet = programSheetRepository.findByProgramCode(request.getProgramCode())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Program sheet not found"));

        JsonNode root = readProgramSheet(programSheet);

        String requestedSemesterLabel = normalizeSemesterLabel(request.getSemester());
        int selectedTermIndex = resolveSelectedTermIndex(requestedSemesterLabel)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "semester must match one of: " + String.join(", ", STANDARD_PLAN_SEMESTERS)
                ));

        String requestedSeason = seasonForTermIndex(selectedTermIndex);
        String catalogSemester = resolveCatalogSemesterForSeason(requestedSeason)
                .orElseGet(() -> request.getSemester());

        Set<String> completedCourses = normalizeCompletedCourses(request.getCompletedCourses());
        Map<String, Integer> creditsByCourseCode = extractCreditsByCode(root);
        RequirementPools pools = extractRequirementPools(root);
        List<PlanTerm> planTerms = buildPlanTerms(root, pools, completedCourses, requestedSeason);

        List<String> planningNotes = new ArrayList<>();
        List<String> blockingIssues = new ArrayList<>();
        LinkedHashSet<String> unavailableCourseCodes = new LinkedHashSet<>();

        PlanTerm selectedTerm = planTerms.get(selectedTermIndex);
        List<AssignedCourse> backlogCourses = collectPriorUntakenCourses(planTerms, selectedTermIndex, completedCourses);
        Set<String> backlogCodes = backlogCourses.stream().map(AssignedCourse::courseCode).collect(Collectors.toCollection(LinkedHashSet::new));

        if (backlogCodes.isEmpty()) {
            planningNotes.add("No untaken courses remain from earlier semesters in the sample four-year plan.");
        } else {
            planningNotes.add("Detected %d untaken earlier-plan course(s); attempting replacement in the selected semester.".formatted(backlogCodes.size()));
        }

        Set<String> pushedCourses = new LinkedHashSet<>();
        for (AssignedCourse backlog : backlogCourses) {
            if (selectedTerm.containsCourse(backlog.courseCode())) {
                continue;
            }

            if (!isCourseOfferedInSeason(backlog.courseCode(), requestedSeason)) {
                unavailableCourseCodes.add(backlog.courseCode());
                continue;
            }

            if (selectedTerm.tryReplaceForBacklog(backlog, creditsByCourseCode, MIN_TERM_CREDITS, MAX_TERM_CREDITS)) {
                continue;
            }

            Optional<AssignedCourse> movableMajor = selectedTerm.findMovableMajor();
            if (movableMajor.isPresent() && moveCourseForwardWithinPlan(
                    movableMajor.get(),
                    selectedTermIndex,
                    planTerms,
                    creditsByCourseCode,
                    requestedSeason
            )) {
                pushedCourses.add(movableMajor.get().courseCode());
                selectedTerm.removeCourse(movableMajor.get().courseCode());
                selectedTerm.addCourse(backlog);
                continue;
            }

                // Defer unresolved-course messaging until after all balancing/fill logic runs so the
                // final blockers reflect the actual final schedule rather than an intermediate state.
        }

        if (!pushedCourses.isEmpty()) {
            planningNotes.add("Shifted forward course(s) to preserve earlier untaken work: " + String.join(", ", pushedCourses));
        }

        applyCreditBalancing(
            selectedTerm,
            selectedTermIndex,
            planTerms,
            pools,
            completedCourses,
            creditsByCourseCode,
            requestedSeason,
            planningNotes
        );
        replaceMajorWithAlternativesWhenPossible(selectedTerm, pools, completedCourses, requestedSeason, planningNotes);

        Map<String, String> displayLabelsByCourseCode = buildDisplayLabelsByCourseCode(planTerms);

        List<AssignedCourse> unresolvedBacklog = backlogCourses.stream()
            .filter(course -> !selectedTerm.containsCourse(course.courseCode()))
            .filter(course -> !unavailableCourseCodes.contains(course.courseCode()))
            .toList();

        for (AssignedCourse course : unresolvedBacklog) {
            blockingIssues.add("%s still does not fit into %s after trying course swaps and forward-shift options, so it remains outside the recommended semester."
                .formatted(describeOutstandingRequirement(course), STANDARD_PLAN_SEMESTERS.get(selectedTermIndex)));
        }

            List<String> unscheduledThisSemester = summarizeRequirements(unresolvedBacklog);

        // Build conflict-aware section picks.
        List<RecommendedCourseDTO> recommendations = buildConflictAwareRecommendations(
                selectedTerm,
                catalogSemester,
                unavailableCourseCodes,
                planningNotes,
                blockingIssues
        );

        List<AssignedCourse> remainingAfterRecommendedTerm = collectRemainingUntakenSamplePlanCourses(
            planTerms,
            completedCourses,
            selectedTerm,
            unavailableCourseCodes
        );

        List<String> remainingRequirementSummaries = summarizeRequirements(remainingAfterRecommendedTerm);

        int remainingSemesters = Math.max(0, STANDARD_PLAN_SEMESTERS.size() - selectedTermIndex - 1);
        int remainingCredits = remainingAfterRecommendedTerm.stream()
                .map(AssignedCourse::courseCode)
                .distinct()
                .mapToInt(code -> creditForCourse(code, creditsByCourseCode))
                .sum();
        boolean canGraduateOnTime = remainingCredits <= remainingSemesters * MAX_TERM_CREDITS;

        if (!remainingRequirementSummaries.isEmpty()) {
            List<String> remainingPreview = remainingRequirementSummaries.stream().limit(12).toList();
            String suffix = remainingRequirementSummaries.size() > remainingPreview.size()
                ? " (plus %d more)".formatted(remainingRequirementSummaries.size() - remainingPreview.size())
                : "";
            planningNotes.add("Still needed after completing this recommended semester: "
                + String.join(", ", remainingPreview) + suffix + ".");
        }

        if (!canGraduateOnTime) {
            if (selectedTerm.courseCountByKind(CourseKind.HUMA) > 0) {
                planningNotes.add("Consider a summer course for HUMA/elective pressure relief.");
            }
            blockingIssues.add("Based on the courses still left after this recommendation, the current plan is not yet on track for on-time graduation without additional changes.");
        }

        if (recommendations.isEmpty() && blockingIssues.isEmpty()) {
            blockingIssues.add("No set of section choices could be built for the selected semester without creating schedule conflicts.");
        }

        return new RecommendationResponseDTO(
                programSheet.getProgramCode(),
                request.getSemester(),
                normalizeCompletedCourseList(request.getCompletedCourses()),
                recommendations,
            unavailableCourseCodes.stream()
                .map(code -> displayLabelsByCourseCode.getOrDefault(code, code))
                .distinct()
                .limit(MAX_UNAVAILABLE_CODES)
                .toList(),
                canGraduateOnTime,
            unscheduledThisSemester,
            remainingRequirementSummaries,
                planningNotes,
                blockingIssues
        );
    }

    private JsonNode readProgramSheet(ProgramSheet programSheet) {
        try {
            return objectMapper.readTree(programSheet.getProgramDataJson());
        } catch (JsonProcessingException error) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Program sheet data could not be read", error);
        }
    }

    private List<RecommendedCourseDTO> buildConflictAwareRecommendations(
            PlanTerm selectedTerm,
            String catalogSemester,
            LinkedHashSet<String> unavailableCourseCodes,
            List<String> planningNotes,
            List<String> blockingIssues
    ) {
        List<AssignedCourse> plannedCourses = selectedTerm.courses();
        Map<String, List<CourseSection>> sectionsByCode = new LinkedHashMap<>();

        for (AssignedCourse assignment : plannedCourses) {
            ParsedCode parsed = parseCourseCode(assignment.courseCode());
            if (parsed == null) {
                continue;
            }

            List<CourseSection> matchingSections = courseSectionRepository.findBySubjectIgnoreCaseAndNumberAndSemester(
                    parsed.subject(),
                    parsed.number(),
                    catalogSemester
            );

            if (matchingSections.isEmpty()) {
                // Course is on the program sheet plan but has no catalog sections in the database.
                // Keep it in the recommendations so the user knows it is expected, but flag it
                // with a null section so the frontend can show a "details unavailable" message.
                sectionsByCode.put(assignment.courseCode(), List.of());
            } else {
                sectionsByCode.put(assignment.courseCode(), matchingSections);
            }
        }

        List<String> sortedByConstraint = sectionsByCode.entrySet().stream()
                .sorted(Comparator.comparingInt(entry -> entry.getValue().size()))
                .map(Map.Entry::getKey)
                .toList();

        // Courses with no catalog sections are tracked separately so they still appear in results.
        Set<String> noCatalogData = sectionsByCode.entrySet().stream()
                .filter(e -> e.getValue().isEmpty())
                .map(Map.Entry::getKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<String, CourseSection> selectedSections = new LinkedHashMap<>();
        Set<ClassTimeKey> occupied = new HashSet<>();

        for (String courseCode : sortedByConstraint) {
            List<CourseSection> candidates = sectionsByCode.get(courseCode);
            if (candidates.isEmpty()) {
                // No catalog data — will be included in results with a null section.
                continue;
            }

            candidates = candidates.stream()
                    .sorted(Comparator
                            .comparing((CourseSection section) -> !section.isOpen())
                            .thenComparing(Comparator.comparingInt(CourseSection::getOpenSeats).reversed())
                            .thenComparing(section -> section.getSection() == null ? "" : section.getSection()))
                    .toList();

            Optional<CourseSection> chosen = candidates.stream()
                    .filter(section -> !conflictsWithOccupied(section, occupied))
                    .findFirst();

            if (chosen.isPresent()) {
                selectedSections.put(courseCode, chosen.get());
                markOccupied(chosen.get(), occupied);
            } else {
                unavailableCourseCodes.add(courseCode);
                blockingIssues.add("%s has catalog sections in %s, but every available option conflicts with another course already in the recommended schedule."
                        .formatted(courseCode, catalogSemester));
            }
        }

        if (selectedSections.size() + noCatalogData.size() < plannedCourses.size()) {
            planningNotes.add("Conflict and/or availability filtering reduced the returned schedule list.");
        }

        if (!noCatalogData.isEmpty()) {
            planningNotes.add("The following course(s) are recommended by your program sheet but have no section data in the catalog — "
                    + "they are included in the results, but section details cannot be verified: "
                    + String.join(", ", noCatalogData) + ".");
        }

        List<RecommendedCourseDTO> dtoList = new ArrayList<>();
        for (AssignedCourse assignment : plannedCourses) {
            if (noCatalogData.contains(assignment.courseCode())) {
                // Include the course with a null section so the frontend can show a warning.
                dtoList.add(new RecommendedCourseDTO(
                        assignment.courseCode(),
                        assignment.title(),
                        assignment.requirementCategory(),
                        "unverified",
                        null
                ));
                continue;
            }

            CourseSection section = selectedSections.get(assignment.courseCode());
            if (section == null) {
                continue;
            }

            dtoList.add(new RecommendedCourseDTO(
                    assignment.courseCode(),
                    assignment.title(),
                    assignment.requirementCategory(),
                    assignment.recommendationType(),
                    toDto(section)
            ));
        }

        return dtoList.stream().limit(MAX_RECOMMENDATIONS).toList();
    }

    private void applyCreditBalancing(
            PlanTerm selectedTerm,
            int selectedTermIndex,
            List<PlanTerm> planTerms,
            RequirementPools pools,
            Set<String> completedCourses,
            Map<String, Integer> creditsByCourseCode,
            String requestedSeason,
            List<String> planningNotes
    ) {
        int termCredits = selectedTerm.totalCredits(creditsByCourseCode);

        // Fill low-credit schedules with the requested policy:
        // 1) Prefer HUMA until there are 2 HUMA courses in this term.
        // 2) Then prefer major-related alternatives.
        // 3) Only allow a 3rd HUMA when no major-related fill is available (last resort to stay on-time).
        while (termCredits < MIN_TERM_CREDITS) {
            int humaCount = selectedTerm.courseCountByKind(CourseKind.HUMA);

            Optional<String> humaCandidate = Optional.empty();
            Optional<String> majorCandidate = Optional.empty();

            if (humaCount < 2) {
                humaCandidate = pickFirstAvailableForTerm(
                        pools.humaCodes(),
                        selectedTerm,
                        completedCourses,
                        requestedSeason,
                        code -> code.startsWith("HUMA ")
                );
            }

            if (humaCandidate.isPresent()) {
                String code = humaCandidate.get();
                selectedTerm.addCourse(new AssignedCourse(
                        code,
                        code,
                        "Humanities Core Fill",
                        "choice",
                        CourseKind.HUMA
                ));
                planningNotes.add("Added HUMA fill %s to improve low-credit load.".formatted(code));
                termCredits = selectedTerm.totalCredits(creditsByCourseCode);
                continue;
            }

                Optional<String> futurePlanMajorCandidate = pickFirstFuturePlanMajorForTerm(
                    selectedTermIndex,
                    planTerms,
                    selectedTerm,
                    completedCourses,
                    requestedSeason,
                    pools
                );

                if (futurePlanMajorCandidate.isPresent()) {
                String code = futurePlanMajorCandidate.get();
                selectedTerm.addCourse(new AssignedCourse(
                    code,
                    code,
                    "Future Sample Plan Priority Fill",
                    "choice",
                    CourseKind.MAJOR
                ));
                planningNotes.add("Added future sample-plan course %s before considering non-plan major fillers."
                    .formatted(code));
                termCredits = selectedTerm.totalCredits(creditsByCourseCode);
                continue;
                }

            majorCandidate = pickFirstAvailableForTerm(
                    pools.majorAlternatives(),
                    selectedTerm,
                    completedCourses,
                    requestedSeason,
                    code -> !code.startsWith("HUMA ")
                        && !wouldExceedChoiceGroupLimit(code, selectedTerm, completedCourses, pools)
            );

            if (majorCandidate.isPresent()) {
                String code = majorCandidate.get();
                selectedTerm.addCourse(new AssignedCourse(
                        code,
                        code,
                        "Major-Related Fill",
                        "choice",
                        CourseKind.MAJOR
                ));
                planningNotes.add("Added major-related fill %s after reaching the default HUMA limit.".formatted(code));
                termCredits = selectedTerm.totalCredits(creditsByCourseCode);
                continue;
            }

            if (humaCount < 3) {
                Optional<String> thirdHuma = pickFirstAvailableForTerm(
                        pools.humaCodes(),
                        selectedTerm,
                        completedCourses,
                        requestedSeason,
                        code -> code.startsWith("HUMA ")
                );

                if (thirdHuma.isPresent()) {
                    String code = thirdHuma.get();
                    selectedTerm.addCourse(new AssignedCourse(
                            code,
                            code,
                            "Humanities Core Fill",
                            "choice",
                            CourseKind.HUMA
                    ));
                    planningNotes.add("Added a third HUMA (%s) because no major-related filler was available and credits were still below target."
                            .formatted(code));
                    termCredits = selectedTerm.totalCredits(creditsByCourseCode);
                    continue;
                }
            }

            // No viable filler remains.
            break;
        }

        // Trim overloaded schedules by removing elective first, then HUMA.
        while (termCredits > MAX_TERM_CREDITS) {
            Optional<AssignedCourse> removable = selectedTerm.firstCourseOfKinds(List.of(CourseKind.ELECTIVE, CourseKind.HUMA));
            if (removable.isEmpty()) {
                break;
            }
            selectedTerm.removeCourse(removable.get().courseCode());
            termCredits = selectedTerm.totalCredits(creditsByCourseCode);
            planningNotes.add("Removed %s to keep credit load within 15-18 when possible.".formatted(removable.get().courseCode()));
        }
    }

    private Optional<String> pickFirstAvailableForTerm(
            List<String> courseCodes,
            PlanTerm selectedTerm,
            Set<String> completedCourses,
            String season,
            java.util.function.Predicate<String> extraFilter
    ) {
        return courseCodes.stream()
                .map(this::normalizeCourseCode)
                .filter(StringUtils::hasText)
                .filter(extraFilter)
                .filter(code -> !selectedTerm.containsCourse(code))
                .filter(code -> !completedCourses.contains(code))
                .filter(code -> isCourseOfferedInSeason(code, season))
                .findFirst();
    }

    private Optional<String> pickFirstFuturePlanMajorForTerm(
            int selectedTermIndex,
            List<PlanTerm> planTerms,
            PlanTerm selectedTerm,
            Set<String> completedCourses,
            String season,
            RequirementPools pools
    ) {
        for (int index = selectedTermIndex + 1; index < planTerms.size(); index++) {
            for (AssignedCourse course : planTerms.get(index).courses()) {
                String code = normalizeCourseCode(course.courseCode());
                if (!StringUtils.hasText(code)) {
                    continue;
                }
                if (selectedTerm.containsCourse(code) || completedCourses.contains(code)) {
                    continue;
                }
                if (course.kind() != CourseKind.MAJOR) {
                    continue;
                }
                if (!isCourseOfferedInSeason(code, season)) {
                    continue;
                }
                if (wouldExceedChoiceGroupLimit(code, selectedTerm, completedCourses, pools)) {
                    continue;
                }
                return Optional.of(code);
            }
        }

        return Optional.empty();
    }

    private boolean wouldExceedChoiceGroupLimit(
            String candidate,
            PlanTerm selectedTerm,
            Set<String> completedCourses,
            RequirementPools pools
    ) {
        for (ChoiceGroup group : pools.choiceGroups()) {
            if (!group.courseCodes().contains(candidate)) {
                continue;
            }

            int satisfied = (int) group.courseCodes().stream()
                    .filter(code -> selectedTerm.containsCourse(code) || completedCourses.contains(code))
                    .count();

            if (satisfied >= group.chooseCount()) {
                return true;
            }
        }

        return false;
    }

    private boolean hasSatisfiedChoiceRequirement(
            Set<String> completedCourses,
            List<String> requirementPool,
            int chooseCount
    ) {
        long satisfied = requirementPool.stream()
                .map(this::normalizeCourseCode)
                .filter(completedCourses::contains)
                .count();

        return satisfied >= chooseCount;
    }

    private void replaceMajorWithAlternativesWhenPossible(
            PlanTerm selectedTerm,
            RequirementPools pools,
            Set<String> completedCourses,
            String requestedSeason,
            List<String> planningNotes
    ) {
        // Implements request item #11 as a lightweight rule: if a major course has a same-category
        // alternative and is not offered this season, swap to an available alternative.
        for (AssignedCourse major : selectedTerm.courses().stream().filter(c -> c.kind() == CourseKind.MAJOR).toList()) {
            if (isCourseOfferedInSeason(major.courseCode(), requestedSeason)) {
                continue;
            }

            Optional<ChoiceGroup> equivalentGroup = findChoiceGroupForCourse(major.courseCode(), pools);
            if (equivalentGroup.isPresent()) {
            ChoiceGroup group = equivalentGroup.get();

            boolean alreadySatisfiedByAlternate = group.courseCodes().stream()
                .filter(code -> !code.equals(major.courseCode()))
                .anyMatch(code -> completedCourses.contains(code) || selectedTerm.containsCourse(code));

            if (alreadySatisfiedByAlternate) {
                selectedTerm.removeCourse(major.courseCode());
                planningNotes.add("Removed %s because an alternate course already satisfies that requirement."
                    .formatted(major.courseCode()));
                continue;
            }

            Optional<String> sameRequirementAlternative = group.courseCodes().stream()
                .map(this::normalizeCourseCode)
                .filter(StringUtils::hasText)
                .filter(code -> !code.equals(major.courseCode()))
                .filter(code -> !selectedTerm.containsCourse(code))
                .filter(code -> !completedCourses.contains(code))
                .filter(code -> isCourseOfferedInSeason(code, requestedSeason))
                .findFirst();

            if (sameRequirementAlternative.isPresent()) {
                selectedTerm.removeCourse(major.courseCode());
                selectedTerm.addCourse(new AssignedCourse(
                    sameRequirementAlternative.get(),
                    sameRequirementAlternative.get(),
                    major.requirementCategory(),
                    "choice",
                    CourseKind.MAJOR
                ));
                planningNotes.add("Replaced unavailable course %s with same-requirement alternative %s."
                    .formatted(major.courseCode(), sameRequirementAlternative.get()));
                continue;
            }
            }

            Optional<String> alternative = pools.majorAlternatives().stream()
                .filter(code -> !code.equals(major.courseCode()))
                    .filter(code -> !selectedTerm.containsCourse(code))
                    .filter(code -> !completedCourses.contains(code))
                .filter(code -> !wouldExceedChoiceGroupLimit(code, selectedTerm, completedCourses, pools))
                    .filter(code -> isCourseOfferedInSeason(code, requestedSeason))
                    .findFirst();

            if (alternative.isPresent()) {
                selectedTerm.removeCourse(major.courseCode());
                selectedTerm.addCourse(new AssignedCourse(
                        alternative.get(),
                        alternative.get(),
                        "Major Alternative",
                        "choice",
                        CourseKind.MAJOR
                ));
                planningNotes.add("Replaced unavailable major course %s with alternative %s."
                        .formatted(major.courseCode(), alternative.get()));
            }
        }
    }

    private Optional<ChoiceGroup> findChoiceGroupForCourse(String courseCode, RequirementPools pools) {
        String normalized = normalizeCourseCode(courseCode);
        return pools.choiceGroups().stream()
                .filter(group -> group.courseCodes().contains(normalized))
                .findFirst();
    }

    private boolean moveCourseForwardWithinPlan(
            AssignedCourse course,
            int fromTermIndex,
            List<PlanTerm> planTerms,
            Map<String, Integer> creditsByCourseCode,
            String requestedSeason
    ) {
        for (int index = fromTermIndex + 1; index < planTerms.size(); index++) {
            PlanTerm candidateTerm = planTerms.get(index);

            // Keep all pushes within the four-year window (Senior Spring index = 7).
            if (index > 7) {
                return false;
            }

            if (!isCourseOfferedInSeason(course.courseCode(), seasonForTermIndex(index))) {
                continue;
            }

            int projectedCredits = candidateTerm.totalCredits(creditsByCourseCode)
                    + creditForCourse(course.courseCode(), creditsByCourseCode);
            if (projectedCredits > MAX_TERM_CREDITS) {
                continue;
            }

            candidateTerm.addCourse(course);
            return true;
        }

        return false;
    }

    private List<AssignedCourse> collectPriorUntakenCourses(
            List<PlanTerm> planTerms,
            int selectedTermIndex,
            Set<String> completedCourses
    ) {
        List<AssignedCourse> backlog = new ArrayList<>();
        for (int index = 0; index < selectedTermIndex; index++) {
            for (AssignedCourse course : planTerms.get(index).courses()) {
                if (!completedCourses.contains(course.courseCode())) {
                    backlog.add(course);
                }
            }
        }
        return backlog;
    }

    private List<PlanTerm> buildPlanTerms(
            JsonNode root,
            RequirementPools pools,
            Set<String> completedCourses,
            String requestedSeason
    ) {
        List<PlanTerm> terms = new ArrayList<>(Collections.nCopies(8, null));

        for (JsonNode yearNode : root.path("sampleFourYearPlan")) {
            String year = yearNode.path("year").asText("");
            for (JsonNode termNode : yearNode.path("terms")) {
                String term = termNode.path("term").asText("");
                String label = "%s %s".formatted(year, term).trim();
                Integer termIndex = TERM_INDEX_BY_LABEL.get(label.toLowerCase(Locale.ROOT));
                if (termIndex == null) {
                    continue;
                }

                PlanTerm planTerm = new PlanTerm(label);
                for (JsonNode courseNode : termNode.path("courses")) {
                    String rawLabel = courseNode.asText("").trim();
                    resolvePlanLabelToAssignments(rawLabel, pools, completedCourses, seasonForTermIndex(termIndex))
                            .forEach(planTerm::addCourse);
                }

                terms.set(termIndex, planTerm);
            }
        }

        for (int index = 0; index < terms.size(); index++) {
            if (terms.get(index) == null) {
                terms.set(index, new PlanTerm(STANDARD_PLAN_SEMESTERS.get(index)));
            }
        }

        return terms;
    }

    private List<AssignedCourse> resolvePlanLabelToAssignments(
            String rawLabel,
            RequirementPools pools,
            Set<String> completedCourses,
            String season
    ) {
        String normalized = rawLabel.toLowerCase(Locale.ROOT);
        List<String> codes = parseCourseTokens(rawLabel);

        if (normalized.contains("electives") && codes.isEmpty()) {
            return pickFirstAvailable(pools.electiveOrGeneralFillers(), completedCourses, season)
                    .map(code -> List.of(new AssignedCourse(code, rawLabel, "General Electives", "choice", CourseKind.ELECTIVE)))
                    .orElseGet(List::of);
        }

        if (normalized.contains("huma") && normalized.contains("writing")) {
            Optional<String> writing = pickFirstAvailable(List.of("WRIT 101"), completedCourses, season);
            if (writing.isPresent()) {
                return List.of(new AssignedCourse(writing.get(), rawLabel, "Writing Requirement", "required", CourseKind.MAJOR));
            }
            return pickFirstAvailable(pools.humaCodes(), completedCourses, season)
                    .map(code -> List.of(new AssignedCourse(code, rawLabel, "Humanities Core", "choice", CourseKind.HUMA)))
                    .orElseGet(List::of);
        }

        if (normalized.contains("huma") && codes.isEmpty()) {
            return pickFirstAvailable(pools.humaCodes(), completedCourses, season)
                    .map(code -> List.of(new AssignedCourse(code, rawLabel, "Humanities Core", "choice", CourseKind.HUMA)))
                    .orElseGet(List::of);
        }

        if (normalized.contains("ssft") && codes.isEmpty()) {
            if (hasSatisfiedChoiceRequirement(completedCourses, pools.ssftCodes(), 1)) {
                return List.of();
            }
            return pickFirstAvailable(pools.ssftCodes(), completedCourses, season)
                    .map(code -> List.of(new AssignedCourse(code, rawLabel, "Studies in Science, Faith, and Technology", "choice", CourseKind.MAJOR)))
                    .orElseGet(List::of);
        }

        if (normalized.contains("social science") && codes.isEmpty()) {
            if (hasSatisfiedChoiceRequirement(completedCourses, pools.socialScienceCodes(), 1)) {
                return List.of();
            }
            return pickFirstAvailable(pools.socialScienceCodes(), completedCourses, season)
                    .map(code -> List.of(new AssignedCourse(code, rawLabel, "Foundations of the Social Sciences", "choice", CourseKind.MAJOR)))
                    .orElseGet(List::of);
        }

        if (normalized.contains("technical elective") && codes.isEmpty()) {
            if (hasSatisfiedChoiceRequirement(completedCourses, pools.technicalElectiveCodes(), 1)) {
                return List.of();
            }
            return pickFirstAvailable(pools.technicalElectiveCodes(), completedCourses, season)
                    .map(code -> List.of(new AssignedCourse(code, rawLabel, "Technical Elective", "choice", CourseKind.MAJOR)))
                    .orElseGet(List::of);
        }

        // Explicit courses and "or/and" expressions in sample plan lines are parsed here.
        if (!codes.isEmpty()) {
            List<AssignedCourse> assignments = new ArrayList<>();

            if (normalized.contains(" or ")) {
                List<List<String>> alternatives = parseAlternativeCourseGroups(rawLabel);

                // If any whole alternative is already satisfied, this requirement is complete.
                boolean alreadySatisfied = alternatives.stream()
                        .anyMatch(group -> !group.isEmpty() && group.stream().allMatch(completedCourses::contains));
                if (alreadySatisfied) {
                    return assignments;
                }

                for (List<String> group : alternatives) {
                    if (group.isEmpty()) {
                        continue;
                    }

                    boolean allOffered = group.stream().allMatch(code -> isCourseOfferedInSeason(code, season));
                    if (!allOffered) {
                        continue;
                    }

                    for (String code : group) {
                        if (!completedCourses.contains(code)) {
                            assignments.add(new AssignedCourse(code, rawLabel, "Sample Plan Course", "required", classifyKind(code)));
                        }
                    }

                    if (!assignments.isEmpty()) {
                        return assignments;
                    }
                }

                Optional<String> chosen = pickFirstAvailable(codes, completedCourses, season);
                chosen.ifPresent(code -> assignments.add(new AssignedCourse(code, rawLabel, "Sample Plan Course", "required", classifyKind(code))));
                return assignments;
            }

            for (String code : codes) {
                if (completedCourses.contains(code)) {
                    continue;
                }
                assignments.add(new AssignedCourse(code, rawLabel, "Sample Plan Course", "required", classifyKind(code)));
            }

            return assignments;
        }

        return List.of();
    }

    private RequirementPools extractRequirementPools(JsonNode root) {
        List<String> huma = new ArrayList<>();
        List<String> social = new ArrayList<>();
        List<String> ssft = new ArrayList<>();
        List<String> technical = new ArrayList<>();
        List<String> majorAlternatives = new ArrayList<>();
        List<ChoiceGroup> choiceGroups = new ArrayList<>();

        for (JsonNode category : root.path("requirementCategories")) {
            String title = category.path("title").asText("").toLowerCase(Locale.ROOT);

            List<String> directCourses = extractCourseCodes(category.path("courses"));
            List<String> selectionCourses = extractCourseCodes(category.path("selection").path("from"));

            if (title.contains("humanities")) {
                huma.addAll(directCourses);
            }

            if (title.contains("social science")) {
                social.addAll(selectionCourses);
            }

            if (title.contains("science, faith")) {
                ssft.addAll(selectionCourses);
            }

            if (title.contains("technical elective")) {
                technical.addAll(selectionCourses);
            }

            // Major alternatives collected from selection and selectionGroups to support replacement logic.
            majorAlternatives.addAll(selectionCourses);

            int selectionChoose = category.path("selection").path("choose").asInt(selectionCourses.size());
            if (selectionCourses.size() > selectionChoose && selectionChoose > 0) {
                choiceGroups.add(new ChoiceGroup(selectionChoose, new LinkedHashSet<>(selectionCourses)));
            }

            category.path("selectionGroups").forEach(group -> {
                List<String> groupCourses = extractCourseCodes(group.path("from"));
                majorAlternatives.addAll(groupCourses);

                int groupChoose = group.path("choose").asInt(groupCourses.size());
                if (groupCourses.size() > groupChoose && groupChoose > 0) {
                    choiceGroups.add(new ChoiceGroup(groupChoose, new LinkedHashSet<>(groupCourses)));
                }
            });
        }

        List<String> fillers = new ArrayList<>();
        fillers.addAll(huma);
        fillers.addAll(social);
        fillers.addAll(ssft);
        fillers.addAll(technical);

        return new RequirementPools(
                distinctList(huma),
                distinctList(social),
                distinctList(ssft),
                distinctList(technical),
                distinctList(majorAlternatives),
                distinctList(fillers),
                choiceGroups
        );
    }

    private Map<String, Integer> extractCreditsByCode(JsonNode root) {
        Map<String, Integer> creditsByCode = new HashMap<>();

        for (JsonNode category : root.path("requirementCategories")) {
            putCreditsFromNodes(creditsByCode, category.path("courses"));
            putCreditsFromNodes(creditsByCode, category.path("selection").path("from"));
            category.path("selectionGroups").forEach(group -> putCreditsFromNodes(creditsByCode, group.path("from")));
        }

        return creditsByCode;
    }

    private void putCreditsFromNodes(Map<String, Integer> creditsByCode, JsonNode nodes) {
        if (!nodes.isArray()) {
            return;
        }

        for (JsonNode node : nodes) {
            if (node.path("subject").isTextual() && node.path("number").canConvertToInt()) {
                String code = buildCourseCode(node.path("subject").asText(), node.path("number").asInt());
                int credits = node.path("credits").asInt(3);
                creditsByCode.putIfAbsent(code, credits);
            }

            if (node.path("bundle").isArray()) {
                for (JsonNode bundled : node.path("bundle")) {
                    if (bundled.path("subject").isTextual() && bundled.path("number").canConvertToInt()) {
                        String code = buildCourseCode(bundled.path("subject").asText(), bundled.path("number").asInt());
                        creditsByCode.putIfAbsent(code, 3);
                    }
                }
            }
        }
    }

    private List<String> extractCourseCodes(JsonNode nodes) {
        if (!nodes.isArray()) {
            return List.of();
        }

        List<String> codes = new ArrayList<>();
        for (JsonNode node : nodes) {
            if (node.path("subject").isTextual() && node.path("number").canConvertToInt()) {
                codes.add(buildCourseCode(node.path("subject").asText(), node.path("number").asInt()));
            }

            if (node.path("subject").isTextual() && node.path("numbers").isArray()) {
                String subject = node.path("subject").asText();
                node.path("numbers").forEach(numberNode -> {
                    if (numberNode.canConvertToInt()) {
                        codes.add(buildCourseCode(subject, numberNode.asInt()));
                    }
                });
            }

            if (node.path("bundle").isArray()) {
                node.path("bundle").forEach(bundleNode -> {
                    if (bundleNode.path("subject").isTextual() && bundleNode.path("number").canConvertToInt()) {
                        codes.add(buildCourseCode(bundleNode.path("subject").asText(), bundleNode.path("number").asInt()));
                    }
                });
            }
        }
        return distinctList(codes);
    }

    private Optional<String> pickFirstAvailable(List<String> courseCodes, Set<String> completedCourses, String season) {
        return courseCodes.stream()
                .map(this::normalizeCourseCode)
                .filter(StringUtils::hasText)
                .filter(code -> !completedCourses.contains(code))
                .filter(code -> isCourseOfferedInSeason(code, season))
                .findFirst();
    }

    private boolean isCourseOfferedInSeason(String courseCode, String season) {
        ParsedCode parsed = parseCourseCode(courseCode);
        if (parsed == null) {
            return false;
        }

        List<CourseSection> sections = courseSectionRepository.findBySubjectIgnoreCaseAndNumber(parsed.subject(), parsed.number());
        if (sections.isEmpty()) {
            // Treat unknown courses as potentially available so requirement-only courses are not auto-rejected.
            return true;
        }

        return sections.stream()
                .map(CourseSection::getSemester)
                .anyMatch(semester -> seasonMatches(semester, season));
    }

    private boolean seasonMatches(String semester, String requestedSeason) {
        if (!StringUtils.hasText(semester)) {
            return false;
        }

        String normalized = semester.toLowerCase(Locale.ROOT);
        if ("fall".equalsIgnoreCase(requestedSeason)) {
            return normalized.contains("fall");
        }
        return normalized.contains("spring");
    }

    private Optional<Integer> resolveSelectedTermIndex(String semesterLabel) {
        String normalized = semesterLabel.toLowerCase(Locale.ROOT).trim();
        if (TERM_INDEX_BY_LABEL.containsKey(normalized)) {
            return Optional.of(TERM_INDEX_BY_LABEL.get(normalized));
        }

        return Optional.empty();
    }

    private String normalizeSemesterLabel(String semester) {
        if (!StringUtils.hasText(semester)) {
            return "";
        }

        String compact = semester.trim().replace('_', ' ');
        return Arrays.stream(compact.split("\\s+"))
                .map(token -> token.substring(0, 1).toUpperCase(Locale.ROOT) + token.substring(1).toLowerCase(Locale.ROOT))
                .collect(Collectors.joining(" "));
    }

    private Optional<String> resolveCatalogSemesterForSeason(String season) {
        return courseSectionRepository.findDistinctSemesters().stream()
                .filter(semester -> seasonMatches(semester, season))
                .sorted()
                .reduce((first, second) -> second);
    }

    private List<AssignedCourse> collectRemainingUntakenSamplePlanCourses(
            List<PlanTerm> planTerms,
            Set<String> completedCourses,
            PlanTerm selectedTerm,
            Set<String> unavailableCourseCodes
    ) {
        List<AssignedCourse> remaining = new ArrayList<>();

        for (PlanTerm term : planTerms) {
            for (AssignedCourse course : term.courses()) {
                String code = normalizeCourseCode(course.courseCode());
                if (!StringUtils.hasText(code)) {
                    continue;
                }
                if (completedCourses.contains(code)) {
                    continue;
                }
                if (selectedTerm.containsCourse(code) && !unavailableCourseCodes.contains(code)) {
                    continue;
                }
                remaining.add(course);
            }
        }

        return remaining;
    }

    private Map<String, String> buildDisplayLabelsByCourseCode(List<PlanTerm> planTerms) {
        Map<String, String> labels = new LinkedHashMap<>();

        for (PlanTerm term : planTerms) {
            for (AssignedCourse course : term.courses()) {
                labels.putIfAbsent(course.courseCode(), describeOutstandingRequirement(course));
            }
        }

        return labels;
    }

    private String describeOutstandingRequirement(AssignedCourse course) {
        String normalizedTitle = Optional.ofNullable(course.title()).orElse("").trim();
        String normalizedCode = normalizeCourseCode(course.courseCode());

        if (!StringUtils.hasText(normalizedTitle)) {
            return normalizedCode;
        }

        String lowered = normalizedTitle.toLowerCase(Locale.ROOT);
        boolean genericLabel = lowered.contains("course")
                || lowered.contains("elective")
                || lowered.contains("requirement")
                || lowered.contains(" or ");

        if (genericLabel && !normalizedTitle.equalsIgnoreCase(normalizedCode)) {
            return normalizedTitle;
        }

        return normalizedCode;
    }

    private List<String> summarizeRequirements(List<AssignedCourse> courses) {
        LinkedHashMap<String, Integer> countsByLabel = new LinkedHashMap<>();

        for (AssignedCourse course : courses) {
            String label = describeOutstandingRequirement(course);
            countsByLabel.merge(label, 1, Integer::sum);
        }

        return countsByLabel.entrySet().stream()
                .map(entry -> entry.getValue() > 1
                        ? "%s (%d remaining)".formatted(entry.getKey(), entry.getValue())
                        : entry.getKey())
                .toList();
    }

    private String seasonForTermIndex(int termIndex) {
        return termIndex % 2 == 0 ? "Fall" : "Spring";
    }

    private boolean conflictsWithOccupied(CourseSection section, Set<ClassTimeKey> occupied) {
        for (ClassTime time : Optional.ofNullable(section.getTimes()).orElseGet(List::of)) {
            ClassTimeKey key = new ClassTimeKey(
                    time.getDay(),
                    time.getStartTime() == null ? null : time.getStartTime().toSecondOfDay(),
                    time.getEndTime() == null ? null : time.getEndTime().toSecondOfDay()
            );

            for (ClassTimeKey existing : occupied) {
                if (existing.conflictsWith(key)) {
                    return true;
                }
            }
        }

        return false;
    }

    private void markOccupied(CourseSection section, Set<ClassTimeKey> occupied) {
        for (ClassTime time : Optional.ofNullable(section.getTimes()).orElseGet(List::of)) {
            occupied.add(new ClassTimeKey(
                    time.getDay(),
                    time.getStartTime() == null ? null : time.getStartTime().toSecondOfDay(),
                    time.getEndTime() == null ? null : time.getEndTime().toSecondOfDay()
            ));
        }
    }

    private int creditForCourse(String courseCode, Map<String, Integer> creditsByCourseCode) {
        if (creditsByCourseCode.containsKey(courseCode)) {
            return creditsByCourseCode.get(courseCode);
        }

        ParsedCode parsed = parseCourseCode(courseCode);
        if (parsed == null) {
            return 3;
        }

        return courseSectionRepository.findBySubjectIgnoreCaseAndNumber(parsed.subject(), parsed.number()).stream()
                .map(CourseSection::getCredits)
                .filter(credits -> credits > 0)
                .findFirst()
                .orElse(3);
    }

    private List<String> parseCourseTokens(String text) {
        List<String> result = new ArrayList<>();
        Matcher matcher = COURSE_TOKEN_PATTERN.matcher(text.toUpperCase(Locale.ROOT));
        while (matcher.find()) {
            result.add("%s %s".formatted(matcher.group(1), matcher.group(2)));
        }
        return distinctList(result);
    }

    private List<List<String>> parseAlternativeCourseGroups(String text) {
        return Arrays.stream(text.split("(?i)\\s+or\\s+"))
                .map(this::parseCourseTokens)
                .filter(group -> !group.isEmpty())
                .toList();
    }

    private ParsedCode parseCourseCode(String code) {
        String normalized = normalizeCourseCode(code);
        Matcher matcher = COURSE_CODE_PATTERN.matcher(normalized);
        if (!matcher.matches()) {
            return null;
        }
        try {
            return new ParsedCode(matcher.group(1), Integer.parseInt(matcher.group(2).replaceAll("[^0-9]", "")));
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private CourseKind classifyKind(String courseCode) {
        return courseCode.startsWith("HUMA ") ? CourseKind.HUMA : CourseKind.MAJOR;
    }

    private List<String> distinctList(List<String> values) {
        return values.stream().map(this::normalizeCourseCode).filter(StringUtils::hasText).distinct().toList();
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

    private record RequirementPools(
            List<String> humaCodes,
            List<String> socialScienceCodes,
            List<String> ssftCodes,
            List<String> technicalElectiveCodes,
            List<String> majorAlternatives,
            List<String> electiveOrGeneralFillers,
            List<ChoiceGroup> choiceGroups
        ) {
        }

        private record ChoiceGroup(
            int chooseCount,
            Set<String> courseCodes
    ) {
    }

    private enum CourseKind {
        MAJOR,
        HUMA,
        ELECTIVE
    }

    private record AssignedCourse(
            String courseCode,
            String title,
            String requirementCategory,
            String recommendationType,
            CourseKind kind
    ) {
    }

    private static final class PlanTerm {
        private final String label;
        private final LinkedHashMap<String, AssignedCourse> courses = new LinkedHashMap<>();

        private PlanTerm(String label) {
            this.label = label;
        }

        private void addCourse(AssignedCourse course) {
            this.courses.putIfAbsent(course.courseCode(), course);
        }

        private void removeCourse(String courseCode) {
            this.courses.remove(courseCode);
        }

        private boolean containsCourse(String courseCode) {
            return this.courses.containsKey(courseCode);
        }

        private List<AssignedCourse> courses() {
            return new ArrayList<>(this.courses.values());
        }

        private int courseCountByKind(CourseKind kind) {
            return (int) this.courses.values().stream().filter(course -> course.kind() == kind).count();
        }

        private Optional<AssignedCourse> firstCourseOfKinds(List<CourseKind> kinds) {
            return this.courses.values().stream()
                    .filter(course -> kinds.contains(course.kind()))
                    .findFirst();
        }

        private Optional<AssignedCourse> findMovableMajor() {
            return this.courses.values().stream()
                    .filter(course -> course.kind() == CourseKind.MAJOR)
                    .findFirst();
        }

        private int totalCredits(Map<String, Integer> creditsByCourseCode) {
            int total = 0;
            for (AssignedCourse course : this.courses.values()) {
                total += creditsByCourseCode.getOrDefault(course.courseCode(), 3);
            }
            return total;
        }

        private boolean tryReplaceForBacklog(
                AssignedCourse backlog,
                Map<String, Integer> creditsByCourseCode,
                int minCredits,
                int maxCredits
        ) {
            for (CourseKind candidateKind : List.of(CourseKind.ELECTIVE, CourseKind.HUMA)) {
                Optional<AssignedCourse> replaceable = this.courses.values().stream()
                        .filter(course -> course.kind() == candidateKind)
                        .findFirst();

                if (replaceable.isEmpty()) {
                    continue;
                }

                AssignedCourse existing = replaceable.get();
                int existingCredits = creditsByCourseCode.getOrDefault(existing.courseCode(), 3);
                int backlogCredits = creditsByCourseCode.getOrDefault(backlog.courseCode(), 3);
                int projected = totalCredits(creditsByCourseCode) - existingCredits + backlogCredits;
                if (projected < minCredits - 1 || projected > maxCredits + 1) {
                    continue;
                }

                removeCourse(existing.courseCode());
                addCourse(backlog);
                return true;
            }

            return false;
        }
    }

    private record ParsedCode(String subject, int number) {
    }

    private record ClassTimeKey(String day, Integer startSecond, Integer endSecond) {
        private boolean conflictsWith(ClassTimeKey other) {
            if (!StringUtils.hasText(day) || !StringUtils.hasText(other.day)) {
                return false;
            }
            if (!day.equalsIgnoreCase(other.day)) {
                return false;
            }
            if (startSecond == null || endSecond == null || other.startSecond == null || other.endSecond == null) {
                return false;
            }

            return startSecond < other.endSecond && other.startSecond < endSecond;
        }
    }
}