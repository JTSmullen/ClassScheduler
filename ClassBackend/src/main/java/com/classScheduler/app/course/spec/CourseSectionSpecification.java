package com.classScheduler.app.course.spec;

import com.classScheduler.app.course.entity.CourseSection;
import jakarta.persistence.criteria.*;
import org.springframework.data.jpa.domain.Specification;
import com.classScheduler.app.search.dto.SearchFilterDTO;

import java.util.Set;

public class CourseSectionSpecification {

    public static Specification<CourseSection> build(SearchFilterDTO filter, Set<String> keywords) {
        return (root, query, cb) -> {

            Predicate predicate = cb.conjunction();

            if (!keywords.isEmpty()) {
                Predicate keywordPredicate = cb.disjunction();

                for (String keyword : keywords) {
                    keywordPredicate = cb.or(
                            keywordPredicate,
                            cb.like(cb.lower(root.get("name")), "%" + keyword.toLowerCase() + "%"),
                            cb.like(cb.lower(root.get("subject")), "%" + keyword.toLowerCase() + "%")
                    );
                }

                predicate = cb.and(predicate, keywordPredicate);
            }



            return predicate;
        };
    }
}
