package com.classScheduler.app.search.dto;

import com.classScheduler.app.course.entity.ClassTime;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

@Getter
@Setter
public class SearchFilterDTO {
    private Set<String> subjects;
    private Set<Integer> numbers;
    private Set<Integer> credits;
    private Set<String> faculty;
    private Set<List<ClassTime>> times;
}