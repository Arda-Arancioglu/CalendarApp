package com.aa.calendar.service;

import com.aa.calendar.dto.*;
import com.aa.calendar.entity.*;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.*;


import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private  final UserTasksRepository userTasksRepository;
    private final CategoryRepository categoryRepository;
    private  final TaskCategoriesRepository taskCategoriesRepository;


    public EventService(TaskRepository taskRepository , UserRepository userRepository ,UserTasksRepository userTasksRepository,CategoryRepository categoryRepository, TaskCategoriesRepository taskCategoriesRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.userTasksRepository = userTasksRepository;
        this.categoryRepository = categoryRepository;
        this.taskCategoriesRepository = taskCategoriesRepository;
    }

    @Transactional
    public EventResponseDTO create(EventRequestDTO dto , Long userId) {
        validateEventDates(dto.startTime(), dto.endTime());
        User creator = userRepository.findById(userId).orElseThrow(()->new ResourceNotFoundException("User not found"));
        Task task = new Task();
        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setStartTime(dto.startTime());
        task.setEndTime(dto.endTime());
        task.setFlexible(dto.isFlexible() != null && dto.isFlexible());
        Task saved = taskRepository.save(task);

        //auto adding the creator
        UserTasks userTasks = new UserTasks();
        userTasks.setUser(creator);
        userTasks.setTask(saved);
        userTasksRepository.save(userTasks);

        if (dto.categoryIds()!=null && !dto.categoryIds().isEmpty()){

            Set<Category> categories = categoryRepository.findAllByCategoryIdInAndUser_UserId(dto.categoryIds(),userId);
            for (Category category : categories) {
                TaskCategories tc = new TaskCategories();
                tc.setTask(saved);
                tc.setCategory(category);
                taskCategoriesRepository.save(tc);
            }
        }
        return mapToDTO(saved);
    }

    public List<EventResponseDTO> getAll(Long userId) {

        userRepository.findById(userId).orElseThrow(()-> new BadRequestException("User not found"));

        List<UserTasks> myEvents =  userTasksRepository.findByUser_UserId(userId);

        return myEvents.stream().map(UserTasks::getTask).map(this::mapToDTO).toList();
    }

    public List<EventResponseDTO> getEventsInRange(Long userId,LocalDateTime start, LocalDateTime end) {
        if (start != null && end != null) {
            validateEventDates(start, end);
        }
        userRepository.findById(userId).orElseThrow(()-> new ResourceNotFoundException("User not found"));

        List<UserTasks> userEvents = userTasksRepository.findByUser_UserId(userId);
        List<EventResponseDTO> events = new ArrayList<>();

        for (UserTasks userTask : userEvents) {
            Task task = userTask.getTask();

            if(task==null || task.getStartTime()==null || task.getEndTime()==null){
                continue;
            }

            boolean endsBeforeStart = (start!= null && task.getEndTime().isBefore(start));
            boolean startsAfterEnd = (end!= null && task.getStartTime().isAfter(end));

            if (!endsBeforeStart && !startsAfterEnd) {
                events.add(mapToDTO(task));
            }
        }

        return events;
    }

    public EventResponseDTO mapToDTO(Task task) {
        List<TaskCategories> taskCategories = taskCategoriesRepository.findByTask_TaskId(task.getTaskId());
        Set<CategoryResponseDTO>  categoryDTOs = taskCategories
                .stream()
                .map(tc->new CategoryResponseDTO(
                        tc.getCategory().getCategoryId(),
                        tc.getCategory().getName(),
                        tc.getCategory().getColor()
                ))
                .collect(Collectors.toSet());

        return new EventResponseDTO(
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                task.getStartTime(),
                task.getEndTime(),
                task.isFlexible(),
                categoryDTOs


        );
    }

    public EventResponseDTO getByID(Long id){
        Task task =  taskRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));
        return mapToDTO(task);
    }

    @Transactional
    public EventResponseDTO deleteByID(Long id){
        Task task =  taskRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));
        EventResponseDTO myResponse = mapToDTO(task);

        taskRepository.delete(task);
        //Delete and not deleteByID because OPTIMIZATIONN :D

        taskCategoriesRepository.deleteByTask_TaskId(id);

        return  myResponse;
    }

    @Transactional
    public EventResponseDTO updateByID(Long id, EventRequestDTO dto, Long userId) {
        validateEventDates(dto.startTime(), dto.endTime());
        Task task =  taskRepository.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));

        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setStartTime(dto.startTime());
        task.setEndTime(dto.endTime());
        task.setFlexible(dto.isFlexible());
        taskRepository.save(task);

        if (dto.categoryIds()!=null){
            taskCategoriesRepository.deleteByTask_TaskId(id);
            Set<Category> categories = categoryRepository.findAllByCategoryIdInAndUser_UserId(dto.categoryIds(),userId);
            for (Category category : categories) {
                TaskCategories tc = new TaskCategories();
                tc.setTask(task);
                tc.setCategory(category);
                taskCategoriesRepository.save(tc);
            }
        }

        return  mapToDTO(task);
    }


    public void deleteEvents() {
        userTasksRepository.deleteAll();
        taskRepository.deleteAll();
    }


    private void validateEventDates(LocalDateTime start, LocalDateTime end) {
        if (start.isAfter(end)) {
            throw  new BadRequestException("Start date is after end date.");
        }
    }



}
