package com.classScheduler.app.search.dto;

import com.classScheduler.app.course.entity.ClassTime;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

@Getter
@Setter
public class SearchFilterDTO {
    private Set<String> department;
    private Set<Integer> credits;
    private Set<String> professor;
    private Set<Integer> courseNumber;
    private Set<List<ClassTime>> times;
}