package com.classScheduler.app.search.dto;

import com.classScheduler.app.course.entity.ClassTime;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.Set;

@Getter
@Setter
public class SearchResponseDTO {
    private Set<SearchItemDTO> results;
    private FilterOptionsDTO filterOptions;

    public SearchResponseDTO(Set<SearchItemDTO> results, FilterOptionsDTO filterOptions) {
        this.results = results;
        this.filterOptions = filterOptions;
    }
}
