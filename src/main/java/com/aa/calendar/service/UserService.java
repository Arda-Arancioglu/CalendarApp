package com.aa.calendar.service;

import com.aa.calendar.dto.UserRequestDTO;
import com.aa.calendar.dto.UserResponseDTO;
import com.aa.calendar.entity.User;
import com.aa.calendar.exception.BadRequestException;

import com.aa.calendar.repository.UserRepository;

import org.springframework.stereotype.Service;

import java.util.regex.Pattern;

@Service
public class UserService {

    private final UserRepository userRepository;

    public UserService(UserRepository userRepository ) {
        this.userRepository = userRepository;
    }

    public UserResponseDTO mapToDTO(User user){
        return new UserResponseDTO(
                user.getUserId(),
                user.getUsername()
        );
    }



    public UserResponseDTO createUser(UserRequestDTO request) {
        validatePassword(request.password());
        validateUsername(request.username());
        User user = new User();
        user.setUsername(request.username());
        user.setPassword(request.password());
        user.setBirthDate(request.birthDate());

        User saved =  userRepository.save(user);
        return mapToDTO(saved);
    }

    private static final Pattern Password_Pattern = Pattern.compile(
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&._\\-#^])[A-Za-z\\d@$!%*?&._\\-#^]{8,32}$"
    );

    private void validatePassword(String password) {
        if (password == null || !Password_Pattern.matcher(password).matches()) {
            throw new BadRequestException("Password must be at least 8 and maximum 32 characters long. It should contain at least: " +
                    "one uppercase letter  ,one lowercase letter , one digit and one special character.");
        }

    }


    private void validateUsername(String username) {
        if(username == null || username.isBlank() ) {
            throw new BadRequestException("Username cannot be empty.");
        }
        String trimmedUsername = username.trim();
        if (trimmedUsername.length() < 3 ||trimmedUsername.length() > 20) {
            throw new BadRequestException("Username is not valid.");
        }
        //Lastly repo check because it is costly
        if ( userRepository.existsByUsername(username)){
            throw new BadRequestException("Username  already exists.");
        }
    }

}
