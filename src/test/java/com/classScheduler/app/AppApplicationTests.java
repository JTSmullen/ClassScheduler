package com.classScheduler.app;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

@SpringBootTest
// This switches to H2 (in memory) for testing
@ActiveProfiles("test")
class AppApplicationTests {

    @Test
    void contextLoads() {
        // This test just checks if the app starts, if it does the test will pass
    }
}