package com.kylerriggs.kanban.config;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.kylerriggs.kanban.exception.ErrorResponseFactory;
import com.kylerriggs.kanban.invite.BoardInviteController;
import com.kylerriggs.kanban.invite.BoardInviteService;
import com.kylerriggs.kanban.invite.dto.InvitePreviewDto;
import com.kylerriggs.kanban.user.UserSynchronizer;
import com.kylerriggs.kanban.user.UserSynchronizerFilter;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@WebMvcTest(controllers = {SecurityTestController.class, BoardInviteController.class})
@Import({
    SecurityConfig.class,
    SecurityProperties.class,
    RestAuthenticationEntryPoint.class,
    RestAccessDeniedHandler.class,
    ErrorResponseFactory.class,
    UserSynchronizerFilter.class,
    RateLimitFilter.class
})
class SecurityConfigWebMvcTest {

    @Autowired private MockMvc mockMvc;

    @MockitoBean private JwtDecoder jwtDecoder;
    @MockitoBean private JpaMetamodelMappingContext jpaMetamodelMappingContext;
    @MockitoBean private UserSynchronizer userSynchronizer;
    @MockitoBean private BoardInviteService boardInviteService;

    @Test
    void protectedEndpointWithoutAuthentication_ReturnsJsonUnauthorized() throws Exception {
        mockMvc.perform(get("/test/auth-only"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.code").value("AUTH_REQUIRED"))
                .andExpect(
                        jsonPath("$.message")
                                .value("Authentication is required to access this resource."))
                .andExpect(jsonPath("$.path").value("/test/auth-only"));
    }

    @Test
    void protectedEndpointWithoutRequiredRole_ReturnsJsonForbidden() throws Exception {
        mockMvc.perform(
                        get("/test/admin-only")
                                .with(jwt().authorities(new SimpleGrantedAuthority("ROLE_USER"))))
                .andExpect(status().isForbidden())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.error").value("Forbidden"))
                .andExpect(jsonPath("$.code").value("FORBIDDEN"))
                .andExpect(
                        jsonPath("$.message")
                                .value("You are not authorized to access this resource."))
                .andExpect(jsonPath("$.path").value("/test/admin-only"));
    }

    @Test
    void previewInviteWithoutAuthentication_RemainsPublic() throws Exception {
        when(boardInviteService.getInvitePreview("public-code"))
                .thenReturn(new InvitePreviewDto("Production Board", true, null));

        mockMvc.perform(get("/invites/public-code/preview"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.boardName").value("Production Board"))
                .andExpect(jsonPath("$.valid").value(true));
    }
}

@RestController
class SecurityTestController {

    @GetMapping("/test/auth-only")
    Map<String, String> authOnly() {
        return Map.of("status", "ok");
    }

    @GetMapping("/test/admin-only")
    @PreAuthorize("hasRole('ADMIN')")
    Map<String, String> adminOnly() {
        return Map.of("status", "ok");
    }
}
