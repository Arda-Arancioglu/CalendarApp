package com.aa.calendar.service;

import com.aa.calendar.dto.SquadCreateRequestDTO;
import com.aa.calendar.dto.SquadJoinRequestDTO;
import com.aa.calendar.dto.SquadResponseDTO;
import com.aa.calendar.entity.*;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.SquadMembersRepository;
import com.aa.calendar.repository.SquadRepository;
import com.aa.calendar.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class SquadService {

    private final SquadMembersRepository squadMembersRepository;
    private final UserRepository userRepository;
    private final SquadRepository squadRepository;

    public SquadService(SquadMembersRepository squadMembersRepository, UserRepository userRepository, SquadRepository squadRepository) {
        this.squadMembersRepository = squadMembersRepository;
        this.userRepository = userRepository;
        this.squadRepository = squadRepository;
    }

    private SquadResponseDTO mapToDTO(Squad squad) {
       return  new SquadResponseDTO(
                squad.getSquadName(),
                squad.getSquadDescription(),
                squad.getInviteCode()

        );
    }

    private static final String ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    private final SecureRandom secureRandom = new SecureRandom();
    private static final int MAX_RETRIES = 10;

    private String inviteCodeGenerator() {
        int len = 8;
        for (int attempt = 0; attempt <MAX_RETRIES; attempt++) {
            StringBuilder sb = new StringBuilder(len);
            for (int i = 0; i < len; i++) {
                int randomIndex = secureRandom.nextInt(ALPHANUMERIC.length());
                sb.append(ALPHANUMERIC.charAt(randomIndex));
            }
            String inviteCode = sb.toString();

            if (!squadRepository.existsByInviteCode(inviteCode)) {
                return inviteCode;
            }
        }

        throw new  IllegalStateException("Failed to generate a unique invite code after " + MAX_RETRIES + " attempts.");
    }

    @Transactional
    public SquadResponseDTO createSquad(SquadCreateRequestDTO dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(()-> new ResourceNotFoundException("User not found with id " + userId));

        Squad squad = new Squad();
        squad.setSquadName(dto.squadName());
        squad.setSquadDescription(dto.squadDescription());
        squad.setInviteCode(inviteCodeGenerator());
        squadRepository.save(squad);

        SquadMember member = new SquadMember();
        member.setSquad(squad);
        member.setUser(user);
        member.setRole(SquadRole.OWNER);
        member.setJoinedAt(LocalDateTime.now());
        squadMembersRepository.save(member);

        return mapToDTO(squad);
    }

    @Transactional
    public SquadResponseDTO joinSquad(SquadJoinRequestDTO dto, Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(()-> new ResourceNotFoundException("User not found with id " + userId));


            Squad squad = squadRepository.findByInviteCode(dto.inviteCode())
                    .orElseThrow(()-> new ResourceNotFoundException("Squad not found with given invite code" + dto.inviteCode()));

            if(squadMembersRepository.existsBySquad_SquadIdAndUser_UserId(squad.getSquadId(), userId)){
               throw new IllegalArgumentException("You are already in this squad");
            }
            SquadMember member = new SquadMember();
            member.setSquad(squad);
            member.setUser(user);
            member.setRole(SquadRole.VIEWER);
            member.setJoinedAt(LocalDateTime.now());
            squadMembersRepository.save(member);
            return mapToDTO(squad);
    }

    public List<SquadResponseDTO> getAllSquads(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(()-> new ResourceNotFoundException("User not found with id " + userId));
        List<SquadMember> sMember = squadMembersRepository.findAllByUser_UserId(userId);
        List<Squad>  squads = sMember.stream().map(SquadMember::getSquad).toList();
        List<SquadResponseDTO> response = new ArrayList<>();
        for(Squad squad : squads){
            response.add(mapToDTO(squad));
        }

        return response;
    }



}
