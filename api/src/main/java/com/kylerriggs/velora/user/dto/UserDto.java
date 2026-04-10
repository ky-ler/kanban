package com.kylerriggs.velora.user.dto;

import jakarta.validation.constraints.NotBlank;

public record UserDto(
        @NotBlank String id,
        @NotBlank String username,
        @NotBlank String email,
        @NotBlank String profileImageUrl) {}
