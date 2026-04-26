package com.classScheduler.app.search.controller;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.search.dto.SearchResponseDTO;
import com.classScheduler.app.search.service.SearchService;
import com.classScheduler.app.search.dto.SearchFilterDTO;
import com.classScheduler.app.search.dto.FilterOptionsDTO;

import jakarta.validation.Valid;
import org.apache.coyote.Response;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Pageable;

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
    public ResponseEntity<SearchResponseDTO> searchAndFilter(@RequestBody SearchFilterDTO filters, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(searchService.searchAndFilter(filters, pageable));
    }

    //get initial filter options global

    @GetMapping("/search/{id}")
    // @GetMapping is used when data is retrieved
    // @PathVariable extracts the value from the URL path
    public ResponseEntity<CourseSectionDTO> searchResultDetails(@PathVariable Long id) {
        return ResponseEntity.ok(searchService.getCourseDetails(id));
    }

    @GetMapping("/filter/options")
    public ResponseEntity<FilterOptionsDTO> globalFilterOptions() {
        return ResponseEntity.ok(searchService.globalFilterOptionsDTO());
    }
}