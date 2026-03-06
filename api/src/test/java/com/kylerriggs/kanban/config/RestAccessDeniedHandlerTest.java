package com.kylerriggs.kanban.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.kanban.exception.ErrorResponse;
import com.kylerriggs.kanban.exception.ErrorResponseFactory;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;

class RestAccessDeniedHandlerTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestAccessDeniedHandler accessDeniedHandler =
            new RestAccessDeniedHandler(objectMapper, new ErrorResponseFactory());

    @Test
    void handle_ReturnsStructuredForbiddenResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/boards/123");
        MockHttpServletResponse response = new MockHttpServletResponse();

        accessDeniedHandler.handle(request, response, new AccessDeniedException("access denied"));

        ErrorResponse body =
                objectMapper.readValue(response.getContentAsByteArray(), ErrorResponse.class);

        assertEquals(HttpStatus.FORBIDDEN.value(), response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertEquals(HttpStatus.FORBIDDEN.value(), body.status());
        assertEquals(HttpStatus.FORBIDDEN.getReasonPhrase(), body.error());
        assertEquals("FORBIDDEN", body.code());
        assertEquals("You are not authorized to access this resource.", body.message());
        assertEquals("/boards/123", body.path());
    }
}
