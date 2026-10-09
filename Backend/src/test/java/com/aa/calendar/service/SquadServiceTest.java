package com.aa.calendar.service;

import com.aa.calendar.dto.SquadKickRequestDTO;
import com.aa.calendar.entity.Squad;
import com.aa.calendar.entity.SquadMember;
import com.aa.calendar.entity.SquadRole;
import com.aa.calendar.exception.AccessDeniedException;
import com.aa.calendar.repository.SquadMembersRepository;
import com.aa.calendar.repository.SquadRepository;
import com.aa.calendar.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

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
   private  SquadRepository squadRepository;

   @InjectMocks
   private SquadService squadService;

   private static final Long SQUAD_ID = 10L;
   private static final Long OWNER_ID = 1L;
   private static final Long ADMIN_ID = 2L;
   private static final Long VIEWER_ID = 3L;

   private SquadMember createMember(SquadRole role){
        SquadMember squadMember = new SquadMember();
        squadMember.setRole(role);
        return squadMember;
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


}