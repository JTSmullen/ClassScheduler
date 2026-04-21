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

            // ensure no duplicates from the join in faculty
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
                        Root<CourseSection> subRoot = subquery.from(CourseSection.class);
                        Join<CourseSection, ClassTime> subTimesJoin = subRoot.join("times");

                        subquery.select(cb.literal(1));

                        // ensure that the subquery is only looking at the current section's times
                        Predicate correlateId = cb.equal(subRoot.get("id"), root.get("id"));

                        // check if the day matches the requested day
                        Predicate matchDay = cb.equal(subTimesJoin.get("day"), reqTime.getDay());

                        // check start time is equal to or after the requested start time
                        Predicate matchStart = cb.greaterThanOrEqualTo(subTimesJoin.<java.time.LocalTime>get("start_time"), reqTime.getStartTime());
                        // check end time is before or equal to the requested end time
                        Predicate matchEnd = cb.lessThanOrEqualTo(subTimesJoin.<java.time.LocalTime>get("end_time"), reqTime.getEndTime());

                        // combine checks into complete subquery
                        subquery.where(cb.and(correlateId, matchDay, matchStart, matchEnd));

                        // use cb.exists since we want to match if at least one meeting time fits
                        rangePredicate = cb.and(rangePredicate, cb.exists(subquery));
                    }
                    // allow course in results if any time slot matches
                    allTimeRangesPredicate = cb.or(allTimeRangesPredicate, rangePredicate);
                }

                // combine into main query
                predicate = cb.and(predicate, allTimeRangesPredicate);
            }

            return predicate;
        };
    }
}
