package com.classScheduler.app.analytics;

import io.micrometer.core.instrument.MeterRegistry;
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

    public record MethodStat(String method, long calls, double avgMs, double maxMs) {}

    @GetMapping("/stats")
    public List<MethodStat> getStats() {
        return registry.find("http.request.duration").timers().stream()
                .map(timer -> new MethodStat(
                        timer.getId().getTag("method"),
                        timer.count(),
                        timer.mean(TimeUnit.MILLISECONDS),
                        timer.max(TimeUnit.MILLISECONDS)
                ))
                .collect(Collectors.toList());
    }
}