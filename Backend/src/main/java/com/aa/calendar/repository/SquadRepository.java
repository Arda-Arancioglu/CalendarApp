package com.aa.calendar.repository;

import com.aa.calendar.entity.Squad;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SquadRepository extends JpaRepository<Squad, Long> {
    boolean existsByInviteCode(String inviteCode);

    Optional<Squad> findByInviteCode(String inviteCode);
}
