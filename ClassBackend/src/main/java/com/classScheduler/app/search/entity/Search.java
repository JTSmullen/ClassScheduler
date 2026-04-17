package com.classScheduler.app.search.entity;

import com.classScheduler.app.course.entity.CourseSection;
import com.classScheduler.app.user.entities.User;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;

// Lombok will automatically generate getters and setters
@Getter
@Setter
// Informs JPA that the class should be mapped to a database entry
@Entity
public class Search {

    // Indicates primary key
    @Id
    // Uses database auto-increment feature to assign unique IDs
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private long id;

    // Define relationship type of Search to CourseSection
    @ManyToMany
    @JoinTable(
            // Specify name of join table
            name = "search_results",
            // Specify name of unique ID for Search in join table
            joinColumns = @JoinColumn(name = "search_id"),
            //Specify name of unique ID for CouseSection in join table
            inverseJoinColumns = @JoinColumn(name = "course_section_id")
    )
    private Set<CourseSection> results = new HashSet<>();

    // Each search belongs to one User
    // Fetch type eager loads user when search is loaded
    @OneToOne(fetch = FetchType.EAGER)
    // Specify name of column in Search entity to reference the User which owns it
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // save keyword to check on future searchAndFilter usages that we are not using unnecessary DB calls
    private Set<String> keywords;
}