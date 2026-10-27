package com.aa.calendar.service;

import com.aa.calendar.dto.Category.CategoryResponseDTO;
import com.aa.calendar.dto.Event.EventRequestDTO;
import com.aa.calendar.dto.Event.EventResponseDTO;
import com.aa.calendar.dto.Event.EventScopeRequestDTO;
import com.aa.calendar.entity.*;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.*;


import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;


import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class EventService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private  final UserTasksRepository userTasksRepository;
    private final CategoryRepository categoryRepository;
    private  final TaskCategoriesRepository taskCategoriesRepository;
    private final RecurrenceExpander recurrenceExpander;
    private final TaskExceptionRepository taskExceptionRepository;

    public EventService(TaskRepository taskRepository , UserRepository userRepository ,
                        UserTasksRepository userTasksRepository,CategoryRepository categoryRepository,
                        TaskCategoriesRepository taskCategoriesRepository , RecurrenceExpander recurrenceExpander,
                        TaskExceptionRepository taskExceptionRepository
        ) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.userTasksRepository = userTasksRepository;
        this.categoryRepository = categoryRepository;
        this.taskCategoriesRepository = taskCategoriesRepository;
        this.recurrenceExpander = recurrenceExpander;
        this.taskExceptionRepository = taskExceptionRepository;
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
        task.setPrivate(dto.isPrivate() != null && dto.isPrivate());
        task.setRecurrenceType(dto.recurrenceType());
        task.setRecurrenceEndDate(dto.recurrenceEndDate());
        task.setRecurrenceInterval(dto.recurrenceInterval());
        task.setRecurrenceDays(dto.recurrenceDays());

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
    @Transactional
    public List<EventResponseDTO> getAll(Long userId) {

        userRepository.findById(userId).orElseThrow(()-> new BadRequestException("User not found"));

        List<UserTasks> myEvents =  userTasksRepository.findByUser_UserId(userId);

        return myEvents.stream().map(UserTasks::getTask).map(this::mapToDTO).toList();
    }

    @Transactional
    public List<EventResponseDTO> getEventsInRange(Long userId,LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null) {
            throw new BadRequestException("Start or end time cannot be null");
        }
        validateEventDates(start, end);
        userRepository.findById(userId).orElseThrow(()-> new ResourceNotFoundException("User not found"));

        RecurrenceType noneType = RecurrenceType.NONE;
        List<Task> tasks = taskRepository.findTasksForCalendarWindow(userId,start,end,start.toLocalDate(),noneType);

        List<EventResponseDTO> events = new ArrayList<>();


        List<Long> taskIds = tasks.stream().map(Task::getTaskId).toList();
        List<TaskException> allExceptions = taskExceptionRepository.findByTask_TaskIdIn(taskIds);

        Map<Long, Map<LocalDate,TaskException>> exceptionsByTask = allExceptions.stream()
                .collect(Collectors.groupingBy(
                        te-> te.getTask().getTaskId(),
                        Collectors.toMap(TaskException::getOriginalDate,te->te)
                ));

        for (Task task : tasks) {
            Set<CategoryResponseDTO> categories = getCategoriesForTask(task.getTaskId());
            Map<LocalDate,TaskException> taskExceptions = exceptionsByTask.getOrDefault(task.getTaskId(),Map.of());
            events.addAll(recurrenceExpander.expandTask(task,categories,start,end,taskExceptions));
        }

        return events;
    }

    private Set<CategoryResponseDTO> getCategoriesForTask(Long taskId) {
        List<TaskCategories> taskCategories = taskCategoriesRepository.findByTask_TaskId(taskId);
        return  taskCategories
                .stream()
                .map(tc->new CategoryResponseDTO(
                        tc.getCategory().getCategoryId(),
                        tc.getCategory().getName(),
                        tc.getCategory().getColor()
                ))
                .collect(Collectors.toSet());
    }

    private EventResponseDTO mapToDTO(Task task) {
        Set<CategoryResponseDTO> categoryDTOs = getCategoriesForTask(task.getTaskId());

        String occurenceId = task.getTaskId()+"_"+(task.getStartTime()!=null? task.getStartTime().toString():"0");

        return new EventResponseDTO(
                occurenceId,
                task.getTaskId(),
                task.getTitle(),
                task.getDescription(),
                task.getStartTime(),
                task.getEndTime(),
                task.isFlexible(),
                categoryDTOs,
                task.isPrivate(),
                task.getRecurrenceType(),
                task.getRecurrenceEndDate(),
                task.getRecurrenceInterval(),
                task.getRecurrenceDays()


        );
    }

    @Transactional
    public EventResponseDTO getByID(Long userId ,Long taskId){
        return userTasksRepository.findByUser_UserIdAndTask_TaskId(userId,taskId)
                .map(UserTasks::getTask)
                .map(this::mapToDTO)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    @Transactional
    public EventResponseDTO deleteByID(Long userId,Long id){

        Task task = userTasksRepository.findByUser_UserIdAndTask_TaskId(userId,id).map(UserTasks::getTask)
                .orElseThrow(()-> new ResourceNotFoundException("User not found"));

        EventResponseDTO myResponse = mapToDTO(task);

        taskExceptionRepository.deleteByTask_TaskId(id);
        taskCategoriesRepository.deleteByTask_TaskId(id);
        userTasksRepository.deleteByTask_TaskId(id);
        taskRepository.delete(task);

        return  myResponse;
    }

    @Transactional
    public EventResponseDTO updateByID(Long id, EventRequestDTO dto, Long userId) {
        validateEventDates(dto.startTime(), dto.endTime());

        if(!userTasksRepository.existsByUser_UserIdAndTask_TaskId(userId,id)){
            throw new ResourceNotFoundException("User not found");
        }

        Task task =  taskRepository.findById(id)
                .orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));

        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setStartTime(dto.startTime());
        task.setEndTime(dto.endTime());
        task.setFlexible(dto.isFlexible() != null && dto.isFlexible());
        task.setPrivate(dto.isPrivate() != null && dto.isPrivate());
        task.setRecurrenceType(dto.recurrenceType());
        task.setRecurrenceEndDate(dto.recurrenceEndDate());
        task.setRecurrenceInterval(dto.recurrenceInterval());
        task.setRecurrenceDays(dto.recurrenceDays());
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


    @Transactional
    public void deleteWithScope(Long taskId, EventScopeRequestDTO dto, Long userId) {
        if(!userTasksRepository.existsByUser_UserIdAndTask_TaskId(userId,taskId)){
            throw new ResourceNotFoundException("Task not found with id : "+ taskId);
        }
        Task task = taskRepository.findById(taskId)
                .orElseThrow(()-> new ResourceNotFoundException("Task not found with id : "+taskId));

        switch(dto.scope()){
            case ALL->{
                taskExceptionRepository.deleteByTask_TaskId(taskId);
                taskCategoriesRepository.deleteByTask_TaskId(taskId);
                userTasksRepository.deleteByTask_TaskId(taskId);
                taskRepository.delete(task);
            }
            case THIS_AND_FOLLOWING ->{
                if(dto.fromDate()==null){
                    throw new BadRequestException("fromDate must be provided for THIS_AND_FOLLOWING");
                }
                task.setRecurrenceEndDate(dto.fromDate().minusDays(1));
                taskRepository.save(task);
            }
            case SELECTED->{
                if(dto.selectedDates()==null || dto.selectedDates().isEmpty()){
                    throw new BadRequestException("selectedDates must be provided for SELECTED");
                }
                for (LocalDate date: dto.selectedDates()){
                    TaskException tEx = taskExceptionRepository.findByTask_TaskIdAndOriginalDate(taskId,date)
                            .orElseGet(()->{
                               TaskException newEx = new TaskException();
                               newEx.setTask(task);
                               newEx.setOriginalDate(date);
                               return newEx;
                            });
                    tEx.setCancelled(true);
                    taskExceptionRepository.save(tEx);
                }
            }
        }
    }


    @Transactional
    public void updateWithScope(Long taskId, EventScopeRequestDTO dto, Long userId) {
        if(!userTasksRepository.existsByUser_UserIdAndTask_TaskId(userId,taskId)){
            throw new ResourceNotFoundException("Task not found with id : "+taskId);
        }
        Task task = taskRepository.findById(taskId)
                .orElseThrow(()-> new ResourceNotFoundException("Task not found with id : "+taskId));

        if(dto.updateData() == null){
            throw new BadRequestException("updateData must be provided for UPDATE");
        }
        switch(dto.scope()){
            case ALL->{
                updateByID(taskId,dto.updateData(),userId);
            }
            case THIS_AND_FOLLOWING ->{
                if(dto.fromDate() == null){
                    throw new BadRequestException("fromDate must be provided for THIS_AND_FOLLOWING");
                }

                task.setRecurrenceEndDate(dto.fromDate().minusDays(1));
                taskRepository.save(task);

                create(dto.updateData(),userId);
            }
            case SELECTED ->{
                if(dto.selectedDates()==null || dto.selectedDates().isEmpty()){
                    throw new BadRequestException("selectedDates must be provided for SELECTED");
                }

                EventRequestDTO data = dto.updateData();
                for(LocalDate date: dto.selectedDates()){
                    TaskException tEx = taskExceptionRepository.findByTask_TaskIdAndOriginalDate(taskId,date)
                            .orElseGet(()->{
                               TaskException newEx = new TaskException();
                               newEx.setTask(task);
                               newEx.setOriginalDate(date);
                               return newEx;
                            });
                    tEx.setCancelled(false);
                    tEx.setNewTitle(data.title());
                    tEx.setNewDescription(data.description());
                    tEx.setNewStartTime(data.startTime());
                    tEx.setNewEndTime(data.endTime());
                    taskExceptionRepository.save(tEx);
                }
            }
        }
    }

    private void validateEventDates(LocalDateTime start, LocalDateTime end) {
        if (start.isAfter(end)) {
            throw  new BadRequestException("Start date is after end date.");
        }
    }



}
