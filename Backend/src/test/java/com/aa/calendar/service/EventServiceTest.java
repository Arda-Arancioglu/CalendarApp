package com.aa.calendar.service;

import com.aa.calendar.dto.EventRequestDTO;
import com.aa.calendar.dto.EventResponseDTO;
import com.aa.calendar.entity.Category;
import com.aa.calendar.entity.Task;
import com.aa.calendar.entity.User;
import com.aa.calendar.entity.UserTasks;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class EventServiceTest {

    @Mock
    private TaskRepository taskRepository;
    @Mock
    private UserTasksRepository userTasksRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private CategoryRepository categoryRepository;
    @Mock
    private TaskCategoriesRepository taskCategoriesRepository;

    @InjectMocks
    private EventService eventService;

    private static final Long USER_ID = 1L;
    private static final Long TASK_ID= 2L;
    private static final LocalDateTime Time1 = LocalDateTime.of(2026,10,13,14,0);
    private static final LocalDateTime Time2 = Time1.plusHours(4);
    private static final LocalDateTime Time3 = Time1.plusDays(3);
    private static final LocalDateTime Time4 = Time1.plusDays(9);

    private User buildUser(){
        User user = new User();
        user.setUsername("test");
        user.setPassword("Test123!");
        return user;
    }
    private EventRequestDTO buildRequestDTO(){
       return new EventRequestDTO(
               "Test title",
               "Test description",
               Time1,
               Time2,
               false,
               Set.of()

       );
    }
    private EventRequestDTO buildBadRequestDTO(){
        return new EventRequestDTO(
                "Test title",
                "Test description",
                Time3,
                Time2,
                false,
                Set.of(1L,2L,3L)

        );
    }
    private Task buildTask() {
        Task task = new Task();
        task.setTaskId(TASK_ID);
        task.setTitle("Test title");
        task.setDescription("Test description");
        task.setStartTime(Time1);
        task.setEndTime(Time2);
        task.setFlexible(false);
        return task;
    }
    private Task buildTask(Long id,LocalDateTime startTime,LocalDateTime endTime) {
        Task task = new Task();
        task.setTaskId(id);
        task.setTitle("Test title");
        task.setDescription("Test description");
        task.setStartTime(startTime);
        task.setEndTime(endTime);
        task.setFlexible(false);
        return task;
    }

    @Nested
    class create {

        @Test
        @DisplayName("create: Should create a task without a problem")
        void create_userCreatesTask_success() {
            User user = buildUser();
            EventRequestDTO eventRequestDTO = buildRequestDTO();

            when(userRepository.findById(USER_ID))
                    .thenReturn(Optional.of(user));

            when(taskRepository.save(any())).thenReturn(buildTask());


            assertDoesNotThrow(() -> {
                eventService.create(eventRequestDTO, USER_ID);
            });

            verify(taskRepository, times(1)).save(any());
            verify(userTasksRepository, times(1)).save(any());
        }

        @Test
        @DisplayName("create: Should throw BadRequestException when end date is before start date")
        void create_userCreatesTaskWithInvalidDate_throwsBadRequestException() {
            EventRequestDTO eventRequestDTO = buildBadRequestDTO();

            assertThrows(BadRequestException.class, () -> {
                eventService.create(eventRequestDTO, USER_ID);
            });

            verify(taskRepository, never()).save(any());

        }

        @Test
        @DisplayName("create: Should throw ResourceNotFoundException when User is not in database")
        void create_userDoesNotExist_throwsResourceNotFoundException() {

            EventRequestDTO requestDTO = buildRequestDTO();

            assertThrows(ResourceNotFoundException.class, () -> {
                eventService.create(requestDTO, USER_ID);
            });

            verify(taskRepository, never()).save(any());
        }
    }

    @Test
    @DisplayName("getEventsInRange: Should work as intended")
    void getEventsInRange_userCallsWithCorrectValues_success(){
        User user = buildUser();
        UserTasks task1 = new UserTasks(1L,buildTask(1L,Time1,Time2),user);
        UserTasks task2 = new UserTasks(2L,buildTask(2L,Time2,Time3),user);
        UserTasks task3 = new UserTasks(3L,buildTask(3L,Time3,Time4),user);
        List<UserTasks> userTasks = List.of(task1,task2,task3);

        when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
        when(userTasksRepository.findByUser_UserId(USER_ID)).thenReturn(userTasks);

        List<EventResponseDTO> myEvent = eventService.getEventsInRange(USER_ID,Time1,Time3.minusSeconds(1L));

        assertEquals(2,myEvent.size(),"Should only include events within the specified time range");

        verify(userTasksRepository,times(1)).findByUser_UserId(USER_ID);

    }

    @Test
    @DisplayName("updateById: Should work as intended")
    void updateById_userUpdatesTasks_success(){

        EventRequestDTO eventRequestDTO = new EventRequestDTO(
                "Test title",
                "Test description",
                Time1,
                Time2,
                false,
                Set.of(1L,2L,3L)

        );
        Category c1 = new Category();
        Category c2 = new Category();
        Category c3 = new Category();

        when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(buildTask()));
        when(categoryRepository.findAllByCategoryIdInAndUser_UserId(eventRequestDTO.categoryIds(),USER_ID))
                .thenReturn(Set.of(c1,c2,c3));

       assertDoesNotThrow(()->{
           eventService.updateByID(TASK_ID,eventRequestDTO,USER_ID);
       });


       verify(taskRepository,times(1)).save(any());
       verify(taskCategoriesRepository,times(1)).deleteByTask_TaskId(any());
       verify(taskCategoriesRepository,times(3)).save(any());

    }

    @Test
    @DisplayName("deleteById: Should work as intended")
    void deleteById_userDeletesTask_success(){

        when(taskRepository.findById(TASK_ID)).thenReturn(Optional.of(buildTask()));

        assertDoesNotThrow(()->{
            eventService.deleteByID(TASK_ID);
        });

        verify(taskRepository,times(1)).delete(any());
        verify(taskCategoriesRepository,times(1)).deleteByTask_TaskId(any());

    }






}
