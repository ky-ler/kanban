package com.kylerriggs.velora.config;

import static org.junit.jupiter.api.Assertions.assertEquals;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.kylerriggs.velora.exception.ErrorResponse;
import com.kylerriggs.velora.exception.ErrorResponseFactory;

import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;

class RestAuthenticationEntryPointTest {

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestAuthenticationEntryPoint entryPoint =
            new RestAuthenticationEntryPoint(objectMapper, new ErrorResponseFactory());

    @Test
    void commence_ReturnsStructuredUnauthorizedResponse() throws Exception {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/boards");
        MockHttpServletResponse response = new MockHttpServletResponse();

        entryPoint.commence(request, response, new BadCredentialsException("bad credentials"));

        ErrorResponse body =
                objectMapper.readValue(response.getContentAsByteArray(), ErrorResponse.class);

        assertEquals(HttpStatus.UNAUTHORIZED.value(), response.getStatus());
        assertEquals("application/json", response.getContentType());
        assertEquals(HttpStatus.UNAUTHORIZED.value(), body.status());
        assertEquals(HttpStatus.UNAUTHORIZED.getReasonPhrase(), body.error());
        assertEquals("AUTH_REQUIRED", body.code());
        assertEquals("Authentication is required to access this resource.", body.message());
        assertEquals("/boards", body.path());
    }
}
