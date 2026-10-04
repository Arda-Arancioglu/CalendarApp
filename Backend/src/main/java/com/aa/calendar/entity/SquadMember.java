package com.aa.calendar.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name= "squad_member")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class SquadMember {

    @Id
    @GeneratedValue(strategy= GenerationType.IDENTITY)
    private Long squadMemberId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "squad_id",nullable = false)
    private Squad squad;

    @ManyToOne(fetch= FetchType.LAZY)
    @JoinColumn(name="user_id",nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SquadRole role;

    private LocalDateTime joinedAt;
}
