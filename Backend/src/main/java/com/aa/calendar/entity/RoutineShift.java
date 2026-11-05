package com.aa.calendar.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;

@Table(name = "routine_shifts")
@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class RoutineShift {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="routine_id",nullable = false)
    private Routine routine;

    @Column(nullable = false)
    private LocalDate shiftDate;

    @NotNull
    private int shiftDays;

}
