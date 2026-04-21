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

    private int currentPage;
    private int totalPages;
    private long totalElements;

    public SearchResponseDTO(Set<SearchItemDTO> results, int currentPage, int totalPages, long totalElements) {
        this.results = results;
        this.currentPage = currentPage;
        this.totalPages = totalPages;
        this.totalElements = totalElements;
    }
}
