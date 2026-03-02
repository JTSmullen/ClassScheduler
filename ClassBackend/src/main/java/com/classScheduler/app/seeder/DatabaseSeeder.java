package com.classScheduler.app.seeder;

import com.classScheduler.app.course.dto.CourseSectionDTO;
import com.classScheduler.app.course.entity.Course;
import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.course.repository.CourseRepository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseSeeder {

    private final CourseRepository courseRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public void run(String... args) throws Exception {

        if (courseRepository.count() <= 0) {
            System.out.println("Database empty seeding now");
            dataSeed();
        } else {
            System.out.println("Database already seeded.");
        }

    }

    private void dataSeed() {

        try {
            InputStream stream = getClass().getClassLoader().getResourceAsStream("data_wolfe.json");

            if (stream == null) {
                System.out.println("No Json found");
                return;
            }

            List<CourseSectionDTO> sections = objectMapper.readValue(
                    stream,
                    new TypeReference<List<CourseSectionDTO>>() {}
            );

            Map<String, Course> courseMap = new HashMap<>();

            for (CourseSectionDTO dto : sections) {

                String courseKey = dto.getSubject() + "-" + dto.getNumber();

                Course course = courseMap.computeIfAbsent(courseKey, k -> {

                    Course c = new Course();

                    c.setSubject(dto.getSubject());
                    c.setNumber(dto.getNumber());
                    c.setName(dto.getName());
                    c.setCredits(dto.getCredits());
                    c.setSections(new ArrayList<>());

                    return c;
                });

                CourseSection section = new CourseSection();

                section.setSubject(dto.getSubject());
                section.setNumber(dto.getNumber());
                section.setName(dto.getName());
                section.setCredits(dto.getCredits());

                section.setLab(dto.isLab());
                section.setOpen(dto.isOpen());

                section.setLocation(dto.getLocation());
                section.setSection(dto.getSection());
                section.setSemester(dto.getSemester());

                section.setOpenSeats(dto.getOpenSeats());
                section.setTotalSeats(dto.getTotalSeats());

                section.setFaculty(dto.getFaculty());

                section.setTimes(dto.getTimes());

                section.setCourse(course);
                course.getSections().add(section);

            }

            courseRepository.saveAll(courseMap.values());

            System.out.println("Saved " + courseMap.size() + " classes to the database");

        } catch (Exception e) {
            System.out.println("Error while seeding");
        }
    }
}
