package com.aa.calendar.repository;

import com.aa.calendar.entity.SquadMember;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;


@Repository
public interface SquadMembersRepository extends JpaRepository<SquadMember,Long> {
    boolean existsBySquad_SquadIdAndUser_UserId(Long squadId,Long userId);

    List<SquadMember> findAllByUser_UserId(Long userId);

    List<SquadMember> findAllBySquad_SquadId(Long squadId);

//    void deleteBySquad_SquadIdAndUser_UserId(Long squadId, Long userId);

    Optional<SquadMember> findBySquad_SquadIdAndUser_UserId(Long id, Long userId);

    void deleteAllBySquad_SquadId(Long squadId);
}
