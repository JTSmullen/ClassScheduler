package com.classScheduler.app.filter.enums;
public enum CreditHours {
    ONE(1),
    TWO(2),
    THREE(3),
    FOUR(4);

    public final int value;
    private CreditHours(int value) {
        this.value = value;
    }
}