package com.kylerriggs.kanban;

import com.kylerriggs.kanban.activity.ActivityLogRepository;
import com.kylerriggs.kanban.board.BoardRepository;
import com.kylerriggs.kanban.board.BoardUserRepository;
import com.kylerriggs.kanban.checklist.ChecklistItemRepository;
import com.kylerriggs.kanban.column.ColumnRepository;
import com.kylerriggs.kanban.comment.CommentRepository;
import com.kylerriggs.kanban.invite.BoardInviteRepository;
import com.kylerriggs.kanban.label.LabelRepository;
import com.kylerriggs.kanban.notification.NotificationRepository;
import com.kylerriggs.kanban.task.TaskRepository;
import com.kylerriggs.kanban.user.UserRepository;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

@SpringBootTest(
        properties =
                "spring.autoconfigure.exclude="
                        + "org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration,"
                        + "org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration,"
                        + "org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration")
class KanbanApplicationTests {

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private ActivityLogRepository activityLogRepository;
    @MockitoBean private BoardInviteRepository boardInviteRepository;
    @MockitoBean private BoardRepository boardRepository;
    @MockitoBean private BoardUserRepository boardUserRepository;
    @MockitoBean private ColumnRepository columnRepository;
    @MockitoBean private CommentRepository commentRepository;
    @MockitoBean private ChecklistItemRepository checklistItemRepository;
    @MockitoBean private LabelRepository labelRepository;
    @MockitoBean private NotificationRepository notificationRepository;
    @MockitoBean private TaskRepository taskRepository;
    @MockitoBean private UserRepository userRepository;
    @MockitoBean private JpaMetamodelMappingContext jpaMappingContext;

    @Test
    void contextLoads() {}
}
