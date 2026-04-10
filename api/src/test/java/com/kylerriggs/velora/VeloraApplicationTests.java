package com.kylerriggs.velora;

import com.kylerriggs.velora.activity.ActivityLogRepository;
import com.kylerriggs.velora.board.BoardRepository;
import com.kylerriggs.velora.board.BoardUserRepository;
import com.kylerriggs.velora.checklist.ChecklistItemRepository;
import com.kylerriggs.velora.column.ColumnRepository;
import com.kylerriggs.velora.comment.CommentRepository;
import com.kylerriggs.velora.invite.BoardInviteRepository;
import com.kylerriggs.velora.label.LabelRepository;
import com.kylerriggs.velora.notification.NotificationRepository;
import com.kylerriggs.velora.task.TaskRepository;
import com.kylerriggs.velora.user.UserRepository;

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
class VeloraApplicationTests {

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
