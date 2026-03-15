package com.classScheduler.app.search.controller;

import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.search.service.SearchService;
import com.classScheduler.app.search.dto.SearchFilterDTO;
import com.classScheduler.app.search.dto.FilterOptionsDTO;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/search")
public class SearchController {

    private final SearchService searchService;

    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @PostMapping
    public ResponseEntity<List<SearchItemDTO>> search(@Valid @RequestBody String query) {

        Set<String> keywords = new HashSet<>(Arrays.asList(query.trim().split("\\s+")));

        return ResponseEntity.ok(searchService.search(keywords));
    }


    @PostMapping("/filter")
    public ResponseEntity<List<SearchItemDTO>> filter(@Valid @RequestBody SearchFilterDTO filter) {

        return ResponseEntity.ok(searchService.filterResults(filter));
    }

    @GetMapping("/filter/options")
    public ResponseEntity<FilterOptionsDTO> filterOptions() {
        return ResponseEntity.ok(searchService.getFilterOptions());
    }
}