package com.classScheduler.app.user.entities;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class User {
    private Advisor advisor;
    private ArrayList<CandidateSchedule> candidateScheduleList;
    private ArrayList<SavedSchedule> savedScheduleList;
    private Search search;
    private String username;
    private String password;


    public void addCandidateSchedule(CandidateSchedule s) {
        this.candidateScheduleList.add(s);
    }

    public void addSavedSchedule(SavedSchedule s) {
        this.savedScheduleList.add(s);
    }

    @Setter
    @Getter
    public class Advisor {
        private String advisorName;
    }


}
