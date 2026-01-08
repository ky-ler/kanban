package com.kylerriggs.kanban.common;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

/**
 * Helper class for executing authorization checks in isolated transactions that commit immediately.
 * This is critical for long-lived async operations like WebSocket connections to avoid holding
 * database connections.
 */
@Component
@RequiredArgsConstructor
public class TransactionalAuthHelper {
    private final PlatformTransactionManager transactionManager;

    /**
     * Executes an authorization check in an isolated read-only transaction that completes
     * immediately. This ensures no database connection is held after the authorization completes.
     *
     * @param authCheck the authorization check to execute
     * @return the result of the authorization check
     */
    public boolean executeAuthCheck(Supplier<Boolean> authCheck) {
        TransactionTemplate template = new TransactionTemplate(transactionManager);
        template.setReadOnly(true);
        template.setPropagationBehavior(TransactionTemplate.PROPAGATION_REQUIRES_NEW);

        Boolean result = template.execute(status -> authCheck.get());
        return result != null && result;
    }
}
