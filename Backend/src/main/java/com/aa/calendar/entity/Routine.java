package com.aa.calendar.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name="routines")
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Routine {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long routineId;

    private String title;

    private String description;

    private int cycleLength;

    private LocalDate startDate;

    private LocalDate endDate;

    private String color;

    @ManyToOne(fetch=FetchType.LAZY)
    private User user;

    @OneToMany(mappedBy = "routine",cascade=CascadeType.ALL,orphanRemoval = true)
    private List<RoutineItem> items=new ArrayList<>();





}
