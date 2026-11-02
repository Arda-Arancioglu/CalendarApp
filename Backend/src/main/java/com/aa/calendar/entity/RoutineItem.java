package com.aa.calendar.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalTime;

@Entity
@Table(name="routine_items")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RoutineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long routineItemId;

    private int dayIndex;

    private String title;

    private String description;

    private LocalTime startTime;

    private LocalTime endTime;

    private boolean isRestDay;

    @ManyToOne(fetch=FetchType.LAZY)
    private Routine routine;


}
