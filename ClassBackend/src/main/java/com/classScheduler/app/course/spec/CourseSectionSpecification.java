package com.classScheduler.app.course.spec;

import com.classScheduler.app.course.entity.CourseSection;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import com.classScheduler.app.search.dto.SearchFilterDTO;
import com.classScheduler.app.course.entity.ClassTime;

import java.util.List;
import java.util.Set;

public class CourseSectionSpecification {

    public static Specification<CourseSection> build(SearchFilterDTO filter, Set<String> keywords) {
        return (root, query, cb) -> {

            // ensure no duplicates from the join in faculty and times
            query.distinct(true);

            Predicate predicate = cb.conjunction();

            // build keyword predicate. Start with disjunction so that we can or together each keyword check
            if (keywords != null && !keywords.isEmpty()) {
                Predicate keywordPredicate = cb.disjunction();

                for (String keyword : keywords) {
                    keywordPredicate = cb.or(keywordPredicate, cb.like(cb.lower(root.get("name")), "%" + keyword.toLowerCase() + "%"), cb.like(cb.lower(root.get("subject")), "%" + keyword.toLowerCase() + "%")
                    );
                }

                // and our keyword predicate with the predicate to add all conditions together
                predicate = cb.and(predicate, keywordPredicate);
            }

            if (filter.getSemesters() != null && !filter.getSemesters().isEmpty()) {
                predicate = cb.and(predicate, root.get("semester").in(filter.getSemesters()));
            }

            if (filter.getSubjects() != null && !filter.getSubjects().isEmpty()) {
                predicate = cb.and(predicate, root.get("subject").in(filter.getSubjects()));
            }

            if (filter.getNumbers() != null && !filter.getNumbers().isEmpty()) {
                predicate = cb.and(predicate, root.get("number").in(filter.getNumbers()));
            }

            if (filter.getCredits() != null && !filter.getCredits().isEmpty()) {
                predicate = cb.and(predicate, root.get("credits").in(filter.getCredits()));
            }

            // deal with potential multiple faculty
            if (filter.getFaculty() != null && !filter.getFaculty().isEmpty()) {
                Join<CourseSection, String> facultyJoin = root.join("faculty");
                predicate = cb.and(predicate, facultyJoin.in(filter.getFaculty()));
            }

            // Class time filtering
            if (filter.getTimes() != null && !filter.getTimes().isEmpty()) {
                // use or for all combinations
                Predicate allTimeRangesPredicate = cb.disjunction();
                for (List<ClassTime> requestedRange : filter.getTimes()) {
                    // use and per sinlge time combination
                    Predicate rangePredicate = cb.conjunction();

                    for (ClassTime reqTime : requestedRange) {
                        // subquery to check if this specific CourseSection has a time matching reqTime
                        Subquery<Integer> subquery = query.subquery(Integer.class);

                        // use proper jpa correlated root
                        Root<CourseSection> correlatedRoot = subquery.correlate(root);
                        Join<CourseSection, ClassTime> subTimesJoin = correlatedRoot.join("times");

                        subquery.select(cb.literal(1));

                        Predicate timeChecks = cb.conjunction();


                        if (reqTime.getDay() != null) {
                            timeChecks = cb.and(timeChecks, cb.equal(subTimesJoin.get("day"), reqTime.getDay()));
                        }

                        if (reqTime.getStartTime() != null) {
                            timeChecks = cb.and(timeChecks, cb.greaterThanOrEqualTo(
                                    subTimesJoin.<java.time.LocalTime>get("startTime"), reqTime.getStartTime()
                            ));
                        }

                        if (reqTime.getEndTime() != null) {
                            timeChecks = cb.and(timeChecks, cb.lessThanOrEqualTo(
                                    subTimesJoin.<java.time.LocalTime>get("endTime"), reqTime.getEndTime()
                            ));
                        }

                        subquery.where(timeChecks);
                        rangePredicate = cb.and(rangePredicate, cb.exists(subquery));
                    }
                    allTimeRangesPredicate = cb.or(allTimeRangesPredicate, rangePredicate);
                }

                // combine into main query
                predicate = cb.and(predicate, allTimeRangesPredicate);
            }

            return predicate;
        };
    }
}
