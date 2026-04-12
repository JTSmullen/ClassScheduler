package com.classScheduler.app.analytics;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/v1/analytics")
public class AnalyticsController {

    private final MeterRegistry registry;

    public AnalyticsController(MeterRegistry registry) {
        this.registry = registry;
    }

    // Helper class for clean JSON output
    public record MethodStat(String method, long calls, double avgMs, double maxMs) {}

    @GetMapping("/stats")
    public List<MethodStat> getStats() {
        // Look for all timers named "http.request.duration"
        return registry.find("http.request.duration").timers().stream()
                .map(timer -> new MethodStat(
                        timer.getId().getTag("method"),  // Get the name from our Tag
                        timer.count(),                   // Total calls
                        timer.mean(TimeUnit.MILLISECONDS), // Avg time in ms
                        timer.max(TimeUnit.MILLISECONDS)   // Max time in ms
                ))
                .collect(Collectors.toList());
    }
}