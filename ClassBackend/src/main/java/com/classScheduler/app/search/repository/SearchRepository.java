package com.classScheduler.app.search.repository;


import com.classScheduler.app.search.entity.Search;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

@Repository
public interface SearchRepository extends JpaRepository<Search, Long> {

}