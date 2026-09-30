package com.aa.calendar.service;


import com.aa.calendar.dto.RegisterRequest;
import com.aa.calendar.dto.UserRequestDTO;
import com.aa.calendar.dto.UserResponseDTO;

import com.aa.calendar.entity.User;

import com.aa.calendar.exception.BadRequestException;

import com.aa.calendar.repository.TaskRepository;
import com.aa.calendar.repository.UserRepository;

import com.aa.calendar.repository.UserTasksRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;


import java.time.LocalDate;
import java.util.regex.Pattern;

@Service
public class UserService {

    private final TaskRepository taskRepository;
    private final UserRepository userRepository;
    private final UserTasksRepository userTasksRepository;
    private final PasswordEncoder passwordEncoder;



    public UserService(TaskRepository taskRepository , UserRepository userRepository ,UserTasksRepository userTasksRepository , PasswordEncoder passwordEncoder) {
        this.taskRepository = taskRepository;
        this.userRepository = userRepository;
        this.userTasksRepository = userTasksRepository;
        this.passwordEncoder = passwordEncoder;
    }

    public UserResponseDTO mapToDTO(User user){
        return new UserResponseDTO(
                user.getUserId(),
                user.getUsername()
        );
    }


    public UserResponseDTO getUserById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("User not found with id: " + userId));
        return mapToDTO(user);
    }

    public User registerUser(RegisterRequest request) {
        validatePassword(request.password());
        validateUsername(request.username());
        validateBirthDate(request.birthDate());

        User user = new User();
        user.setUsername(request.username().trim());
        user.setPassword(passwordEncoder.encode(request.password()));
        user.setBirthDate(request.birthDate());

        return  userRepository.save(user);
    }

    private static final Pattern Password_Pattern = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&._\\-#^])[A-Za-z\\d@$!%*?&._\\-#^]{8,32}$"
    );

    public void validatePassword(String password) {
        if (password == null || !Password_Pattern.matcher(password).matches()) {
            throw new BadRequestException("Password must be at least 8 and maximum 32 characters long. It should contain at least: " +
                    "one uppercase letter  ,one lowercase letter , one digit and one special character.");
        }
    }

    public void validateUsername(String username) {
        if(username == null || username.isBlank() ) {
            throw new BadRequestException("Username cannot be empty.");
        }

        if (username.length() < 3 ||username.length() > 20) {
            throw new BadRequestException("Username should be between 3 and 20 characters.");
        }
        //Lastly repo check because it is costly
        if ( userRepository.existsByUsername(username)){
            throw new BadRequestException("Username  already exists.");
        }
    }

    private void validateBirthDate(LocalDate birthDate) {
        if(birthDate==null){
            throw new BadRequestException("Birth date cannot be empty.");
        }
        if(birthDate.isAfter(LocalDate.now())){
            throw new BadRequestException("Birth date cannot be in the future.");
        }
    }

}
