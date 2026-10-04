package com.aa.calendar.entity;


import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name= "squad")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Squad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long squadId;

    @Column(nullable = false)
    private String squadName;

    private String squadDescription;

    @Column(nullable = false, unique = true, length = 8)
    private String inviteCode;


}
