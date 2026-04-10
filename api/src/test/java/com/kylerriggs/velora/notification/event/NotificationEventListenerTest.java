package com.kylerriggs.velora.notification.event;

import static org.mockito.Mockito.verify;

import com.kylerriggs.velora.board.BoardRepository;
import com.kylerriggs.velora.notification.NotificationService;
import com.kylerriggs.velora.notification.event.NotificationEvent.CommentDeletedEvent;
import com.kylerriggs.velora.task.TaskRepository;
import com.kylerriggs.velora.user.UserRepository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.UUID;

@ExtendWith(MockitoExtension.class)
class NotificationEventListenerTest {

    @Mock private NotificationService notificationService;
    @Mock private UserRepository userRepository;
    @Mock private TaskRepository taskRepository;
    @Mock private BoardRepository boardRepository;

    @InjectMocks private NotificationEventListener notificationEventListener;

    @Test
    void handleCommentDeleted_marksNotificationsReadByReferenceId() {
        UUID commentId = UUID.fromString("e556c2d0-891b-44de-816b-c9259cd00395");

        notificationEventListener.handleCommentDeleted(new CommentDeletedEvent(commentId));

        verify(notificationService).markAllAsReadByReferenceId(commentId);
    }
}
