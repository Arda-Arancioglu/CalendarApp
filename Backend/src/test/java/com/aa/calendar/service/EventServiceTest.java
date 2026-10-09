package com.aa.calendar.service;

import com.aa.calendar.dto.EventRequestDTO;
import com.aa.calendar.entity.Task;
import com.aa.calendar.entity.User;
import com.aa.calendar.repository.*;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
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

    @Test
    @DisplayName("create: Should create a task without a problem")
    void create_userCreatesTask_Success(){
        User user = buildUser();
        EventRequestDTO eventRequestDTO = buildRequestDTO();

        when(userRepository.findById(USER_ID))
                .thenReturn(Optional.of(user));

        when(taskRepository.save(any())).thenReturn(buildTask());


        assertDoesNotThrow(()->{
            eventService.create(eventRequestDTO,USER_ID);
        });

        verify(taskRepository,times(1)).save(any());
        verify(userTasksRepository,times(1)).save(any());
    }






}
