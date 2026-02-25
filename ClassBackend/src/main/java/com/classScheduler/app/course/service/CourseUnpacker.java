package com.classScheduler.app.course.service;

import com.classScheduler.app.course.entity.CourseData;
import com.classScheduler.app.course.entity.CourseSection;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.PropertyNamingStrategies;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.List;

/**
 * Service responsible for loading and unpacking course data from a JSON resource file
 * at application startup.
 *
 * <p>This component reads the {@code data_wolfe.json} file located in the
 * {@code src/main/resources} directory, deserializes it into a {@link CourseData}
 * object using Jackson, and extracts the list of {@link CourseSection} objects.
 *
 * <p>The loading process runs automatically after the Spring container initializes
 * this bean, via the {@link jakarta.annotation.PostConstruct} lifecycle hook.
 *
 * <p>This class currently logs the number of sections loaded but may later be extended
 * to persist course data into a database or cache.
 *
 * @author George Rule
 */
@Service
public class CourseUnpacker {
//    {
//      "credits":3,
//      "faculty":["Graybill, Keith B."],
//      "is_lab":false,
//      "is_open":true,
//      "location":"SHAL 316",
//      "name":"PRINCIPLES OF ACCOUNTING I",
//      "number":201,
//      "open_seats":1,
//      "section":"A",
//      "semester":"2023_Fall",
//      "subject":"ACCT",
//      "times":[
//          {"day":"T","end_time":"16:45:00","start_time":"15:30:00"},
//          {"day":"R","end_time":"16:45:00","start_time":"15:30:00"}
//      ],
//      "total_seats":30}
    @PostConstruct
    private void seed() {
        try {
            ObjectMapper mapper = new ObjectMapper();
            mapper.setPropertyNamingStrategy(PropertyNamingStrategies.SNAKE_CASE);

            InputStream is = CourseUnpacker.class
                    .getClassLoader()
                    .getResourceAsStream("data_wolfe.json");

            CourseData data = mapper.readValue(is, CourseData.class);

            List<CourseSection> sections = data.getClasses();

            System.out.println("Loaded sections: " + sections.size());

        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
