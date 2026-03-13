package com.classScheduler.app.search.controller;

import com.classScheduler.app.search.dto.SearchItemDTO;
import com.classScheduler.app.search.service.SearchService;
import com.classScheduler.app.search.dto.SearchFilterDTO;

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

    @GetMapping
    public ResponseEntity<List<SearchItemDTO>> search(@RequestParam String query) {

        Set<String> keywords = new HashSet<>(Arrays.asList(query.split(" ")));

        return ResponseEntity.ok(searchService.search(keywords));
    }


    @GetMapping("/filter")
    public ResponseEntity<List<SearchItemDTO>> filter(SearchFilterDTO filter) {

        return ResponseEntity.ok(searchService.filterResults(filter));
    }
}