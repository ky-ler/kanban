package com.kylerriggs.kanban.user;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    /**
     * Sets the default board for the current user.
     * Requires the user to be authenticated and modifying their own data.
     *
     * @param boardId the ID of the board to set as default
     * @return no content
     */
    @PostMapping("/default-board")
    public ResponseEntity<Void> setDefaultBoard(@Valid @RequestBody UUID boardId) {
        userService.setDefaultBoard(boardId);
        return ResponseEntity.ok().build();
    }

    /**
     * Retrieves the current user's default board.
     * Requires the user to be authenticated.
     *
     * @return the current user's default board
     */
    @GetMapping("/default-board")
    public ResponseEntity<UUID> getDefaultBoard() {
        UUID boardId = userService.getDefaultBoard();
        return ResponseEntity.ok(boardId);
    }
}
