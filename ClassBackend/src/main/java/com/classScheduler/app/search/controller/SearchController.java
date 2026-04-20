package com.classScheduler.app.search.controller;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.search.dto.SearchResponseDTO;
import com.classScheduler.app.search.service.SearchService;
import com.classScheduler.app.search.dto.SearchFilterDTO;
import com.classScheduler.app.search.dto.FilterOptionsDTO;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

// Tells spring the class will handle REST API requests
@RestController
// Defines base URL for entire class. The strings specified in Mappings in this class will be appended to this base URL.
@RequestMapping("/api/v1/search")
public class SearchController {

    private final SearchService searchService;

    // Spring will automatically detect this class and inject a SearchService bean
    public SearchController(SearchService searchService) {
        this.searchService = searchService;
    }

    @PostMapping("/filter")
    // @RequestBody used when data is sent as JSON in the request body
    public ResponseEntity<SearchResponseDTO> searchAndFilter(@Valid @RequestBody SearchFilterDTO filters) {
        return ResponseEntity.ok(searchService.searchAndFilter(filters));
    }

    @GetMapping("/search/{id}")
    // @GetMapping is used when data is retrieved
    // @PathVariable extracts the value from the URL path
    public ResponseEntity<CourseSectionDTO> searchResultDetails(@PathVariable Long id) {
        return ResponseEntity.ok(searchService.getCourseDetails(id));
    }
}