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

    @GetMapping("/filter")
    // @RequestBody used when data is sent as JSON in the request body
    // Include default page number and size. Embed these parameters in the URL but DTO in JSON body
    public ResponseEntity<SearchResponseDTO> searchAndFilter(@RequestBody SearchFilterDTO filters, @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "50") int size) {
        Pageable pageable = PageRequest.of(page, size);

        return ResponseEntity.ok(searchService.searchAndFilter(filters, pageable));
    }

    @GetMapping("/search/{id}")
    // @GetMapping is used when data is retrieved
    // @PathVariable extracts the value from the URL path
    public ResponseEntity<CourseSectionDTO> searchResultDetails(@PathVariable Long id) {
        return ResponseEntity.ok(searchService.getCourseDetails(id));
    }
}