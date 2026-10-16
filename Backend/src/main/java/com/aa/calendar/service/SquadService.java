package com.aa.calendar.service;

import com.aa.calendar.dto.*;
import com.aa.calendar.entity.*;
import com.aa.calendar.exception.AccessDeniedException;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.*;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;


import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class SquadService {

    private final SquadMembersRepository squadMembersRepository;
    private final UserRepository userRepository;
    private final SquadRepository squadRepository;
    private final TaskRepository taskRepository;
    private final UserTasksRepository   userTasksRepository;


    public SquadService(SquadMembersRepository squadMembersRepository,
                        UserRepository userRepository,
                        SquadRepository squadRepository,
                        TaskRepository taskRepository,
                        UserTasksRepository userTaskRepository
                        ) {
        this.squadMembersRepository = squadMembersRepository;
        this.userRepository = userRepository;
        this.squadRepository = squadRepository;
        this.taskRepository = taskRepository;
        this.userTasksRepository = userTaskRepository;

    }

    private SquadResponseDTO mapToDTO(Squad squad) {
       return  new SquadResponseDTO(
                squad.getSquadId(),
                squad.getSquadName(),
                squad.getSquadDescription(),
                squad.getInviteCode()
        );
    }

    private SquadSummaryResponseDTO mapToSummaryDTO(SquadMember squadMember) {
       return new SquadSummaryResponseDTO(
               squadMember.getSquad().getSquadId(),
               squadMember.getSquad().getSquadName(),
               squadMember.getSquad().getSquadDescription(),
               squadMember.getRole()
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
                .orElseThrow(()-> new ResourceNotFoundException("User not found with id : " + userId));

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
                .orElseThrow(()-> new ResourceNotFoundException("User not found with id : " + userId));

        Squad squad = squadRepository.findByInviteCode(dto.inviteCode())
                .orElseThrow(()-> new ResourceNotFoundException("Squad not found with given invite code : " + dto.inviteCode()));

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

    public List<SquadSummaryResponseDTO> getAllSquads(Long userId) {
       if (!userRepository.existsById(userId)){
           throw new ResourceNotFoundException("User not found with id : " + userId);
       }
       return squadMembersRepository.findAllByUser_UserId(userId).stream()
               .map(this::mapToSummaryDTO)
               .toList();
    }

    public SquadDetailResponseDTO getSquad(Long userId, Long squadId) {
        if (!userRepository.existsById(userId)){
            throw new ResourceNotFoundException("User not found with id : " + userId);
        }

        if(!squadMembersRepository.existsBySquad_SquadIdAndUser_UserId(squadId, userId)){
            throw new ResourceNotFoundException("You are not a member of this squad or there is no such squad ");
        }

        Squad squad =  squadRepository.findById(squadId).
                orElseThrow(()-> new ResourceNotFoundException("Squad not found with id : " + squadId));

        List<SquadMemberResponseDTO> memberList = squadMembersRepository.findAllBySquad_SquadId(squadId)
                .stream()
                .map(m -> new SquadMemberResponseDTO(
                        m.getUser().getUserId(),
                        m.getUser().getUsername(),
                        m.getRole(),
                        m.getJoinedAt()
                )).toList();
        return new SquadDetailResponseDTO(
                squad.getSquadId(),
                squad.getSquadName(),
                squad.getSquadDescription(),
                squad.getInviteCode(),
                memberList
        );
    }

    @Transactional
    public void leaveSquad(Long userId, Long squadId) {
        SquadMember myMember = squadMembersRepository.findBySquad_SquadIdAndUser_UserId(squadId, userId)
                        .orElseThrow(()-> new ResourceNotFoundException("Squad not found with id : " + squadId));
        if(myMember.getRole() == SquadRole.OWNER){
            throw new AccessDeniedException("You can leave this squad after passing your Ownership or by deleting the whole squad");
        }
         squadMembersRepository.delete(myMember);
    }

    @Transactional
    public void kickFromSquad(SquadKickRequestDTO requestDTO , Long userId , Long squadId ) {
        //OWNER's cannot kick themselves?
        //1 OWNER per squad
        //objects.equals helps with null values
        if (Objects.equals(userId, requestDTO.targetUserId())) {
            throw new AccessDeniedException("You cannot kick yourself. Use the leave squad feature instead.");
        }
        SquadMember myMember = squadMembersRepository.findBySquad_SquadIdAndUser_UserId(squadId, userId)
                .orElseThrow(()-> new ResourceNotFoundException("You are not in this squad or the squad id : "+ squadId+" is wrong" ));

        SquadMember targetMember = squadMembersRepository.findBySquad_SquadIdAndUser_UserId(squadId, requestDTO.targetUserId())
                .orElseThrow(()-> new ResourceNotFoundException("The target id : "+requestDTO.targetUserId() +" is not in this squad or the squad id : "+ squadId+" is wrong"));

        if(myMember.getRole() == SquadRole.ADMIN &&  ( targetMember.getRole() == SquadRole.OWNER || targetMember.getRole() == SquadRole.ADMIN  )){
           throw new AccessDeniedException("You cannot kick someone above your role in a squad");
        }
        if(myMember.getRole() == SquadRole.VIEWER){
            throw new AccessDeniedException("You don't have permission to kick ANY squad member");
        }

        squadMembersRepository.delete(targetMember);
    }

    @Transactional
    public void deleteSquad(Long userId, Long squadId) {

        SquadMember myMember = squadMembersRepository.findBySquad_SquadIdAndUser_UserId(squadId, userId)
                .orElseThrow(()-> new ResourceNotFoundException("You are not in this squad or the squad id : "+ squadId+" is wrong" ));

        if(myMember.getRole() != SquadRole.OWNER ){
            throw new AccessDeniedException("You cannot delete this squad if you are not the OWNER");
        }

        squadMembersRepository.deleteAllBySquad_SquadId(squadId);
        squadRepository.deleteById(squadId);

    }


    @Transactional
    public void updateMemberVisibility(UpdateVisibilityRequestDTO dto, Long userId){
        SquadMember member = squadMembersRepository.findBySquad_SquadIdAndUser_UserId(dto.squadId(),userId)
                .orElseThrow(()->new ResourceNotFoundException("Member not found in squad id: "+ dto.squadId() ));

        member.setVisibility(dto.visibility());
        squadMembersRepository.save(member);
    }

    @Transactional
    public void updateMemberRole(UpdateRoleRequestDTO dto, Long userId){
        if (Objects.equals(userId,dto.memberId())){
            throw new AccessDeniedException("You cannot update your own squad role");
        }

        SquadMember userMember= squadMembersRepository.findBySquad_SquadIdAndUser_UserId( dto.squadId(),userId)
                .orElseThrow(()-> new ResourceNotFoundException("You are not a member of squad id: "+ dto.squadId() ));
        SquadMember dtoMember= squadMembersRepository.findBySquad_SquadIdAndUser_UserId( dto.squadId(),dto.memberId())
                .orElseThrow(()-> new ResourceNotFoundException("User with id :"+dto.memberId()+ " are not a member of squad id: "+ dto.squadId() ));




        if ((userMember.getRole() == SquadRole.OWNER) && (dto.role() == SquadRole.OWNER)){
            userMember.setRole(SquadRole.ADMIN);
            dtoMember.setRole(SquadRole.OWNER);
        }
        else if (userMember.getRole() == SquadRole.OWNER){
            dtoMember.setRole(dto.role());
        }
        else if(userMember.getRole() == SquadRole.ADMIN ){
            if(dtoMember.getRole() == SquadRole.OWNER || dtoMember.getRole() == SquadRole.ADMIN){
                throw new AccessDeniedException("You cannot update ADMINS or an OWNER squad role");
            }
            else if(dto.role() == SquadRole.OWNER){
                throw new  AccessDeniedException("You cannot give OWNER role");
            }
            else if(dto.role() == SquadRole.ADMIN ){
                dtoMember.setRole(SquadRole.ADMIN);
            }
            else if(dto.role() == SquadRole.VIEWER){
                throw new BadRequestException("The member is already a VIEWER role");
            }
        }
        else {
            throw new  AccessDeniedException("You cannot change a role");
        }

        squadMembersRepository.save(userMember);
        squadMembersRepository.save(dtoMember);

    }

    private List<SquadEventResponseDTO> mapToDTOEvent(List<Task> tasks , EventVisibility vis , Boolean isCaller) {
        List<SquadEventResponseDTO> squadEvents = new ArrayList<>();
        if(isCaller){
            for(Task task : tasks){
                SquadEventResponseDTO event = new SquadEventResponseDTO(
                        task.getTaskId(),
                        task.getTitle(),
                        task.getStartTime(),
                        task.getEndTime(),
                        task.isFlexible()
                );
                squadEvents.add(event);
            }
            return squadEvents;
        }
        switch (vis){
            case PUBLIC:
                for(Task task : tasks){
                    String displayTitle = task.isPrivate() ? "Private" : task.getTitle();
                    SquadEventResponseDTO event = new SquadEventResponseDTO(
                            task.getTaskId(),
                            displayTitle,
                            task.getStartTime(),
                            task.getEndTime(),
                            task.isFlexible()
                    );
                    squadEvents.add(event);
                }
                break;

            case BUSY:
                for(Task task : tasks){
                    SquadEventResponseDTO event = new SquadEventResponseDTO(
                            task.getTaskId(),
                            "BUSY",
                            task.getStartTime(),
                            task.getEndTime(),
                            task.isFlexible()
                    );
                    squadEvents.add(event);
                }

                break;
            case MUTED:
                //Muted means no view for the squad but this doesn't mean they cannot use functions
                // They will use functions such as find a suitable time. (Planned)
               default:
        }

        return squadEvents;
    }

    public List<SquadCalendarResponseDTO> getSquadCalendar(SquadCalendarRequestDTO dto, Long userId) {

       if(!userRepository.existsById(userId) || !squadMembersRepository.existsBySquad_SquadIdAndUser_UserId(dto.squadId(),userId)){
           throw new ResourceNotFoundException("User not found with id : " + userId + " in the given squad id: " + dto.squadId()) ;
       }

       List<SquadMember> members = squadMembersRepository.findAllBySquad_SquadId(dto.squadId());
       List<Long> userIds = members.stream()
                .map(m->m.getUser().getUserId()).toList();

       List<UserTasks> userTasks = userTasksRepository.findTasksByUserIdsAndDateRange(userIds,dto.startTime(),dto.endTime());
       List<SquadCalendarResponseDTO> response = new ArrayList<>();

       Map<Long,List<Task>> taskByUser = userTasks.stream()
               .collect(Collectors.groupingBy(
                       ut -> ut.getUser().getUserId() ,
                       Collectors.mapping(UserTasks::getTask, Collectors.toList())
               ));


       for(SquadMember member : members){
           EventVisibility memberVis = member.getVisibility();
           Long memberId  = member.getUser().getUserId();
           boolean isCaller = Objects.equals(memberId,userId);

           List <Task> tasks = taskByUser.getOrDefault(memberId,List.of());

           List<SquadEventResponseDTO> events =  mapToDTOEvent(tasks,memberVis, isCaller);
           SquadCalendarResponseDTO responseDTO = new SquadCalendarResponseDTO(memberId,events);
           response.add(responseDTO);
       }
       return response;
    }


}
