package com.classScheduler.app.search.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.Set;

@Getter
@Setter
@AllArgsConstructor
public class FilterOptionsDTO {

    private Set<String> departments;
    private Set<Integer> credits;
    private Set<String> professors;
    private Set<Integer> courseNumbers;

}