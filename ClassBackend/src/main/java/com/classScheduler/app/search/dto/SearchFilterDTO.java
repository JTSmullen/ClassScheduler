package com.classScheduler.app.search.dto;

import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
public class SearchFilterDTO {
    private Set<String> department;
    private Set<Integer> credits;
    private Set<String> professor;
    private Set<Integer> courseNumber;
}