package com.aa.calendar.service;

import com.aa.calendar.dto.EventRequestDTO;
import com.aa.calendar.dto.EventResponseDTO;
import com.aa.calendar.entity.Task;
import com.aa.calendar.exception.ResourceNotFoundException;
import com.aa.calendar.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class EventService {

    private final TaskRepository repository;

    public EventService(TaskRepository repository) {
        this.repository = repository;
    }

    public EventResponseDTO create(EventRequestDTO dto) {
        Task task = new Task();
        task.setTitle(dto.title());
        task.setDescription(dto.description());
        task.setStartTime(dto.startTime());
        task.setEndTime(dto.endTime());
        Task saved = repository.save(task);

        return mapToDTO(saved);
    }

    public List<EventResponseDTO> getAll() {
        return repository.findAll()
                .stream()
                .map(this::mapToDTO)
                .toList();
    }

    public EventResponseDTO mapToDTO(Task task){
        return new EventResponseDTO(
                task.getId(),
                task.getTitle(),
                task.getDescription(),
                task.getStartTime(),
                task.getEndTime()
        );
    }

    public EventResponseDTO getByID(Long id){
      Task task =  repository.findById(id).orElseThrow(()-> new ResourceNotFoundException("Event with the given id : "+id+" is not found."));
    return mapToDTO(task);
    }

}
