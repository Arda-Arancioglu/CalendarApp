package com.aa.calendar.service;

import com.aa.calendar.dto.*;
import com.aa.calendar.entity.Task;
import com.aa.calendar.entity.User;
import com.aa.calendar.entity.UserTasks;
import com.aa.calendar.exception.BadRequestException;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.TaskRepository;


import com.aa.calendar.repository.UserRepository;
import com.aa.calendar.repository.UserTasksRepository;
import jakarta.transaction.Transactional;
import org.springframework.stereotype.Service;


import java.time.LocalDateTime;
import java.util.List;

@Service
public class EventService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private  final UserTasksRepository userTasksRepository;

    public EventService(TaskRepository taskRepository , UserRepository userRepository ,UserTasksRepository userTasksRepository) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.userTasksRepository = userTasksRepository;

    }

    public EventResponseDTO create(EventRequestDTO dto) {
        validateEventDates(dto.startTime(), dto.endTime());
        Task task = new Task();
        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setStartTime(dto.startTime());
        task.setEndTime(dto.endTime());
        Task saved = taskRepository.save(task);

        return mapToDTO(saved);
    }

    public List<EventResponseDTO> getAll() {
        return taskRepository.findAll()
            .stream()
            .map(this::mapToDTO)
            .toList();
    }

    public EventResponseDTO mapToDTO(Task task){
        return new EventResponseDTO(
            task.getTaskId(),
            task.getTitle(),
            task.getDescription(),
            task.getStartTime(),
            task.getEndTime()
        );
    }

    public EventResponseDTO getByID(Long id){
        Task task =  taskRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));
        return mapToDTO(task);
    }

    public EventResponseDTO deleteByID(Long id){
        Task task =  taskRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));
        EventResponseDTO myResponse = mapToDTO(task);
        taskRepository.delete(task);
        //Delete and not deleteByID because OPTIMIZATIONN :D
        return  myResponse;
    }

    public EventResponseDTO updateByID(Long id, EventRequestDTO dto){
        validateEventDates(dto.startTime(), dto.endTime());
        Task task =  taskRepository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));
        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setStartTime(dto.startTime());
        task.setEndTime(dto.endTime());
        taskRepository.save(task);
        return  mapToDTO(task);
    }

    public List<EventResponseDTO> getEventsInRange(LocalDateTime start, LocalDateTime end) {
        List<Task> myEvent = taskRepository.findByStartTimeBetween(start, end);
        if (!myEvent.isEmpty()) {
           return myEvent.stream().map(this::mapToDTO).toList();
        }
        throw  new ResourceNotFoundException("There is no event between given start time and end time.");


    }

    public void deleteEvents() {
        taskRepository.deleteAll();
    }

    @Transactional
    public void assignUserToTask(Long userId, Long taskId) {

        User user = userRepository.findById(userId)
                .orElseThrow(()->new ResourceNotFoundException("User "+ userId +" not found"));

        Task task = taskRepository.findById(taskId)
                .orElseThrow(()->new ResourceNotFoundException("Task "+ taskId +" not found"));

        if(userTasksRepository.existsByUser_UserIdAndTask_TaskId(userId,taskId)){
            throw new BadRequestException("User :"+ userId +" has already assigned to task :"+taskId);
        }


        UserTasks userTasks = new UserTasks();
        userTasks.setUser(user);
        userTasks.setTask(task);
        userTasksRepository.save(userTasks);

    }

    public List<EventResponseDTO> myCalendar(Long userId) {
        userRepository.findById(userId).orElseThrow(()-> new BadRequestException("User not found"));
        List<UserTasks> myEvents =  userTasksRepository.findByUser_UserId(userId);
        return myEvents.stream().map(UserTasks::getTask).map(this::mapToDTO).toList();
    }

    private void validateEventDates(LocalDateTime start, LocalDateTime end) {
        if (start.isAfter(end)) {
            throw  new BadRequestException("Start date is after end date.");
        }
    }

}
