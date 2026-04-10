package com.kylerriggs.velora.notification;

import com.kylerriggs.velora.notification.dto.NotificationDto;
import com.kylerriggs.velora.user.UserMapper;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationMapper {
    private final UserMapper userMapper;

    public NotificationDto toDto(Notification notification) {
        return new NotificationDto(
                notification.getId(),
                notification.getType().name(),
                notification.getMessage(),
                notification.isRead(),
                userMapper.toSummaryDto(notification.getActor()),
                notification.getTask().getId(),
                notification.getTask().getTitle(),
                notification.getBoard().getId(),
                notification.getBoard().getName(),
                notification.getDateCreated() != null
                        ? notification.getDateCreated().toString()
                        : null);
    }
}
