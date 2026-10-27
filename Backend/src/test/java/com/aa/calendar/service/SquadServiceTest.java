package com.aa.calendar.service;

import com.aa.calendar.dto.Squad.SquadKickRequestDTO;
import com.aa.calendar.dto.Squad.UpdateRoleRequestDTO;
import com.aa.calendar.dto.Squad.UpdateVisibilityRequestDTO;
import com.aa.calendar.entity.*;
import com.aa.calendar.exception.AccessDeniedException;
import com.aa.calendar.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SquadServiceTest {

   @Mock
   private  SquadMembersRepository squadMembersRepository;

   @Mock
   private  UserRepository userRepository;

   @Mock
   private UserTasksRepository userTasksRepository;

   @Mock
   private TaskRepository taskRepository;

   @Mock
   private RecurrenceExpander recurrenceExpander;

    @Mock
    private TaskExceptionRepository taskExceptionRepository;

   @InjectMocks
   private SquadService squadService;

   private static final Long SQUAD_ID = 10L;
   private static final Long OWNER_ID = 1L;
   private static final Long ADMIN_ID = 2L;
   private static final Long VIEWER_ID = 3L;
   private static final Long CALLER_ID = 4L;
   private static final Long TARGET_ID = 5L;


    private static final LocalDateTime Time1 = LocalDateTime.of(2026,10,13,14,0);
    private static final LocalDateTime Time2 = Time1.plusHours(4);


   private SquadMember createMember(SquadRole role){
        SquadMember squadMember = new SquadMember();
        squadMember.setRole(role);
        return squadMember;
    }
   private SquadMember createMember(SquadRole role,User user){
        SquadMember squadMember = new SquadMember();
        squadMember.setRole(role);
        squadMember.setUser(user);
        return squadMember;
   }
    private Task buildTask(Long id, String title, String description , LocalDateTime startTime, LocalDateTime endTime
                           , boolean  isFlexible , boolean isPrivate , RecurrenceType recurrenceType, LocalDate time) {
        Task task = new Task();
        task.setTaskId(id);
        task.setTitle(title);
        task.setDescription(description);
        task.setStartTime(startTime);
        task.setEndTime(endTime);
        task.setFlexible(isFlexible);
        task.setPrivate(isPrivate);
        task.setRecurrenceType(recurrenceType);
        task.setRecurrenceEndDate(time);
        return task;
    }

   @Nested
   class leaveSquadTests {
       @Test
       @DisplayName("leaveSquad: Should throw AccessDeniedException when the caller is OWNER")
       void leaveSquad_asOwner_throwsAccessDeniedException() {
           SquadMember ownerMember = createMember(SquadRole.OWNER);


           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, OWNER_ID))
                   .thenReturn(Optional.of(ownerMember));


           assertThrows(AccessDeniedException.class, () -> {
               squadService.leaveSquad(OWNER_ID, SQUAD_ID);

           });

           verify(squadMembersRepository, never()).delete(any());

       }

       @Test
       @DisplayName("leaveSquad : Should leave normally without a problem")
       void leaveSquad_asViewer_shouldSucceed() {

           SquadMember viewerMember = createMember(SquadRole.VIEWER);

           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, VIEWER_ID))
                   .thenReturn(Optional.of(viewerMember));

           assertDoesNotThrow(() -> {
               squadService.leaveSquad(VIEWER_ID, SQUAD_ID);
           });

           verify(squadMembersRepository, times(1)).delete(viewerMember);
       }
   }

   @Nested
   class kickFromSquadTests {

       @Test
       @DisplayName("kickFromSquad: ADMIN cannot kick OWNER")
       void kickFromSquad_adminKicksOwner_throwsAccessDeniedException() {

           SquadMember ownerMember = createMember(SquadRole.OWNER);

           SquadMember adminMember = createMember(SquadRole.ADMIN);

           SquadKickRequestDTO myDTO = new SquadKickRequestDTO(
                   OWNER_ID
           );


           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, OWNER_ID))
                   .thenReturn(Optional.of(ownerMember));

           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, ADMIN_ID))
                   .thenReturn(Optional.of(adminMember));


           assertThrows(AccessDeniedException.class, () -> {
               squadService.kickFromSquad(myDTO, ADMIN_ID, SQUAD_ID);
           });

           verify(squadMembersRepository, never()).delete(any());

       }

       @Test
       @DisplayName("kickFromSquad: Should kick Admin as Owner without a problem")
       void kickFromSquad_ownerKicksAdmin_shouldSucceed() {
           SquadMember ownerMember = createMember(SquadRole.OWNER);
           SquadMember adminMember = createMember(SquadRole.ADMIN);
           SquadKickRequestDTO request = new SquadKickRequestDTO(
                   ADMIN_ID
           );

           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, OWNER_ID))
                   .thenReturn(Optional.of(ownerMember));
           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, ADMIN_ID))
                   .thenReturn(Optional.of(adminMember));

           assertDoesNotThrow(() -> {
               squadService.kickFromSquad(request, OWNER_ID, SQUAD_ID);
           });

           verify(squadMembersRepository, times(1)).delete(adminMember);

       }

       @Test
       @DisplayName("kickFromSquad: Should kick Viewer as Admin without a problem")
       void kickFromSquad_adminKicksViewer_shouldSucceed() {
           SquadMember adminMember = createMember(SquadRole.ADMIN);
           SquadMember viewerMember = createMember(SquadRole.VIEWER);
           SquadKickRequestDTO request = new SquadKickRequestDTO(
                   VIEWER_ID
           );

           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, ADMIN_ID))
                   .thenReturn(Optional.of(adminMember));
           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, VIEWER_ID))
                   .thenReturn(Optional.of(viewerMember));


           assertDoesNotThrow(() -> {
               squadService.kickFromSquad(request, ADMIN_ID, SQUAD_ID);
           });

           verify(squadMembersRepository, times(1)).delete(viewerMember);

       }

       @Test
       @DisplayName("kickFromSquad: Should throw AccessDeniedException when the VIEWER tries kicking anyone")
       void kickFromSquad_viewerKicksViewer_throwsAccessDeniedException() {
           SquadMember viewerMember1 = createMember(SquadRole.VIEWER);
           SquadMember viewerMember2 = createMember(SquadRole.VIEWER);
           Long viewer2Id = 5L;
           SquadKickRequestDTO request = new SquadKickRequestDTO(
                   viewer2Id
           );
           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, VIEWER_ID))
                   .thenReturn(Optional.of(viewerMember1));

           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, viewer2Id))
                   .thenReturn(Optional.of(viewerMember2));


           assertThrows(AccessDeniedException.class, () -> {
               squadService.kickFromSquad(request, VIEWER_ID, SQUAD_ID);
           });

           verify(squadMembersRepository, never()).delete(any());

       }

       @Test
       @DisplayName("kickFromSquad: Should throw AccessDeniedException when ADMIN tries to kick another ADMIN")
       void kickFromSquad_adminKicksAdmin_throwsAccessDeniedException() {
           SquadMember adminMember1 = createMember(SquadRole.ADMIN);
           SquadMember adminMember2 = createMember(SquadRole.ADMIN);
           Long admin2Id = 5L;
           SquadKickRequestDTO request = new SquadKickRequestDTO(
                   admin2Id
           );

           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, ADMIN_ID))
                   .thenReturn(Optional.of(adminMember1));
           when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, admin2Id))
                   .thenReturn(Optional.of(adminMember2));

           assertThrows(AccessDeniedException.class, () -> {
               squadService.kickFromSquad(request, ADMIN_ID, SQUAD_ID);
           });
           verify(squadMembersRepository, never()).delete(any());
       }

       @Test
       @DisplayName("kickFromSquad: Should throw AccessDeniedException when someone tries to kick themselves")
       void kickFromSquad_ownerKicksThemselves_throwsAccessDeniedException() {
           SquadKickRequestDTO request = new SquadKickRequestDTO(
                   OWNER_ID
           );

           assertThrows(AccessDeniedException.class, () -> {
               squadService.kickFromSquad(request, OWNER_ID, SQUAD_ID);
           });

           verify(squadMembersRepository, never()).delete(any());

       }
   }

   @Test
   @DisplayName("getSquadCalendar: Should work without a problem")
    void getSquadCalendar_userGetsTasks_success(){
        User owner = new User();
        owner.setUserId(OWNER_ID);

        User admin = new User();
        admin.setUserId(ADMIN_ID);

        User viewer = new User();
        viewer.setUserId(VIEWER_ID);

        SquadMember squadMember1 = createMember(SquadRole.OWNER,owner);
        squadMember1.setVisibility(EventVisibility.PUBLIC);

        SquadMember squadMember2 = createMember(SquadRole.ADMIN,admin);
        squadMember2.setVisibility(EventVisibility.BUSY);

        SquadMember squadMember3 = createMember(SquadRole.VIEWER,viewer);
        squadMember3.setVisibility(EventVisibility.MUTED);


        Task task1 = new Task(1L,"title","des",Time1,Time2,true,true,RecurrenceType.DAILY,  null, 1, null);
        Task task2 = new Task(2L,"title","des",Time1,Time2,true,false,RecurrenceType.NONE,  null, 1, null);
        Task task3 = new Task(3L,"title","des",Time1,Time2,true,false,RecurrenceType.NONE,  null, 1, null);


       UserTasks ut1 = new UserTasks();
       ut1.setUser(owner);
       ut1.setTask(task1);

       UserTasks ut2 = new UserTasks();
       ut2.setUser(admin);
       ut2.setTask(task2);

       UserTasks ut3 = new UserTasks();
       ut3.setUser(viewer);
       ut3.setTask(task3);

        when(userRepository.existsById(OWNER_ID)).thenReturn(true);
        when(squadMembersRepository.existsBySquad_SquadIdAndUser_UserId(SQUAD_ID, OWNER_ID)).thenReturn(true);
        when(squadMembersRepository.findAllBySquad_SquadId(SQUAD_ID)).thenReturn(List.of(squadMember1, squadMember2, squadMember3));

        when(userTasksRepository.findTasksByUserIdsAndDateRange(any(),eq(Time1),eq(Time2),any(),any())).thenReturn(List.of(ut1,ut2,ut3));

        assertDoesNotThrow(() -> {
            squadService.getSquadCalendar(SQUAD_ID,Time1 , Time2, OWNER_ID);
        });

        verify(userTasksRepository, times(1)).findTasksByUserIdsAndDateRange(any(),any(),any(),any(),any());
        verify(squadMembersRepository , times(1)).findAllBySquad_SquadId(SQUAD_ID);
    }


    @Test
    @DisplayName("updateMemberVisibility: Should  work without a problem")
    void updateMemberVisibility(){
       SquadMember squadMember1 = new SquadMember();

        UpdateVisibilityRequestDTO dto = new UpdateVisibilityRequestDTO(
                EventVisibility.PUBLIC,
                SQUAD_ID
        );

       when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, CALLER_ID))
               .thenReturn(Optional.of(squadMember1));

       assertDoesNotThrow(() -> {
           squadService.updateMemberVisibility(dto, CALLER_ID);
       });

       verify(squadMembersRepository, times(1)).save(squadMember1);

    }

    @Nested
    class updateMemberRoleTests {
        @ParameterizedTest
        @CsvSource({
                "ADMIN,OWNER,ADMIN",
                "ADMIN,ADMIN,ADMIN",
                "ADMIN,ADMIN,VIEWER",
                "ADMIN,VIEWER,OWNER",
                "VIEWER,VIEWER,ADMIN",
                "VIEWER,ADMIN,VIEWER"
        })
        @DisplayName("updateMemberRole: Should throw AccessDeniedException")
        void updateMemberRole_unauthorizedCombinations_throwsAccessDeniedException(SquadRole callersRole, SquadRole targetsRole, SquadRole requestedRole) {

            UpdateRoleRequestDTO dto = new UpdateRoleRequestDTO(requestedRole, SQUAD_ID, TARGET_ID);

            SquadMember caller = createMember(callersRole);
            SquadMember target = createMember(targetsRole);

            when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, CALLER_ID))
                    .thenReturn(Optional.of(caller));
            when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, TARGET_ID))
                    .thenReturn(Optional.of(target));
            assertThrows(AccessDeniedException.class, () -> {
                squadService.updateMemberRole(dto, CALLER_ID);
            });

            verify(squadMembersRepository, never()).save(any());


        }

        @ParameterizedTest
        @CsvSource({
                "OWNER,VIEWER,ADMIN",
                "ADMIN,VIEWER,ADMIN",
                "OWNER,ADMIN,OWNER",
                "OWNER,VIEWER,OWNER",
                "OWNER,ADMIN,VIEWER"
        })
        @DisplayName("updateMemberRole: Should throw AccessDeniedException")
        void updateMemberRole_authorizedCombinations_shouldSucceed(SquadRole callersRole, SquadRole targetsRole, SquadRole requestedRole) {

            UpdateRoleRequestDTO dto = new UpdateRoleRequestDTO(requestedRole, SQUAD_ID, TARGET_ID);

            SquadMember caller = createMember(callersRole);
            SquadMember target = createMember(targetsRole);

            when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, CALLER_ID))
                    .thenReturn(Optional.of(caller));
            when(squadMembersRepository.findBySquad_SquadIdAndUser_UserId(SQUAD_ID, TARGET_ID))
                    .thenReturn(Optional.of(target));
            assertDoesNotThrow(() -> {
                squadService.updateMemberRole(dto, CALLER_ID);
            });

            verify(squadMembersRepository, times(1)).save(target);


        }
    }



}