package com.aa.calendar.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name="task_exception")
@Setter
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TaskException {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name="task_id",nullable=false)
    private Task task;

    @Column(nullable = false)
    private LocalDate originalDate;

    @Column(nullable = false)
    private boolean isCancelled = false;

    private String newTitle;
    private String newDescription;
    private LocalDateTime newStartTime;
    private LocalDateTime newEndTime;

}


