package com.kylerriggs.kanban.config;

import com.kylerriggs.kanban.user.UserSynchronizerFilter;

import lombok.RequiredArgsConstructor;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpHeaders;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.oauth2.server.resource.web.BearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity(securedEnabled = true)
@RequiredArgsConstructor
public class SecurityConfig {
    private static final String CSP_POLICY =
            "default-src 'self'; "
                    + "script-src 'self'; "
                    + "style-src 'self' 'unsafe-inline'; "
                    + "img-src 'self' data: https:; "
                    + "font-src 'self'; "
                    + "connect-src 'self' wss: ws:; "
                    + "frame-ancestors 'none'";

    private static final List<String> SWAGGER_PATHS =
            List.of(
                    "/v3/api-docs",
                    "/v3/api-docs.yaml",
                    "/v3/api-docs/**",
                    "/api-docs",
                    "/api-docs.yaml",
                    "/api-docs/**",
                    "/swagger-resources",
                    "/swagger-resources/**",
                    "/configuration/ui",
                    "/configuration/security",
                    "/swagger-ui/**",
                    "/swagger-ui.html",
                    "/webjars/**");

    private final SecurityProperties securityProperties;
    private final RestAuthenticationEntryPoint restAuthenticationEntryPoint;
    private final RestAccessDeniedHandler restAccessDeniedHandler;
    private final UserSynchronizerFilter userSynchronizerFilter;
    private final RateLimitFilter rateLimitFilter;

    @Value("${springdoc.api-docs.enabled:true}")
    private boolean apiDocsEnabled;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        List<String> publicPaths = new ArrayList<>();
        if (apiDocsEnabled) {
            publicPaths.addAll(SWAGGER_PATHS);
        }
        publicPaths.addAll(
                List.of(
                        "/invites/*/preview",
                        "/ws",
                        "/ws/**",
                        "/ws-sockjs",
                        "/ws-sockjs/**",
                        "/actuator/health",
                        "/actuator/info"));

        http.cors(Customizer.withDefaults())
                .csrf(AbstractHttpConfigurer::disable)
                .headers(
                        headers ->
                                headers.contentSecurityPolicy(
                                        csp -> csp.policyDirectives(CSP_POLICY)))
                .exceptionHandling(
                        exceptions ->
                                exceptions
                                        .authenticationEntryPoint(restAuthenticationEntryPoint)
                                        .accessDeniedHandler(restAccessDeniedHandler))
                .authorizeHttpRequests(
                        req ->
                                req.requestMatchers(publicPaths.toArray(String[]::new))
                                        .permitAll()
                                        .anyRequest()
                                        .authenticated())
                .oauth2ResourceServer(
                        auth ->
                                auth.jwt(Customizer.withDefaults())
                                        .authenticationEntryPoint(restAuthenticationEntryPoint))
                .addFilterAfter(userSynchronizerFilter, BearerTokenAuthenticationFilter.class)
                .addFilterAfter(rateLimitFilter, UserSynchronizerFilter.class);

        return http.build();
    }

    @Bean
    public CorsFilter corsFilter() {
        final UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        final CorsConfiguration config = new CorsConfiguration();
        config.setAllowCredentials(true);
        config.setAllowedOrigins(securityProperties.getCorsAllowedOrigins());
        config.setAllowedHeaders(
                Arrays.asList(
                        HttpHeaders.AUTHORIZATION,
                        HttpHeaders.ORIGIN,
                        HttpHeaders.CONTENT_TYPE,
                        HttpHeaders.ACCEPT));

        config.setAllowedMethods(Arrays.asList("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));

        source.registerCorsConfiguration("/**", config);

        return new CorsFilter(source);
    }

    /**
     * Configures bearer token resolution. Default behavior is to look for Authorization: Bearer
     * <token> header.
     *
     * @return BearerTokenResolver
     */
    @Bean
    public BearerTokenResolver bearerTokenResolver() {
        return new DefaultBearerTokenResolver();
    }
}
