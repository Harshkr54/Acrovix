package com.acrovix.admin.config;

import com.acrovix.admin.tenant.TenantContext;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.BeansException;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.datasource.DelegatingDataSource;
import org.springframework.lang.NonNull;

import javax.sql.DataSource;
import java.lang.reflect.InvocationHandler;
import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.lang.reflect.Proxy;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;

/**
 * PostgreSQL Row-Level Security (RLS) connection interceptor.
 * Injects 'SET LOCAL app.current_tenant_id = <id>' upon transaction initiation
 * or connection checkout, guaranteeing physical database-level boundary enforcement.
 */
@Slf4j
@Configuration
public class TenantRlsConnectionInterceptor implements BeanPostProcessor {

    @Override
    public Object postProcessAfterInitialization(@NonNull Object bean, @NonNull String beanName) throws BeansException {
        if (bean instanceof DataSource dataSource && !(bean instanceof TenantRlsDataSource)) {
            log.info("Wrapping DataSource '{}' with TenantRlsDataSource for PostgreSQL RLS injection", beanName);
            return new TenantRlsDataSource(dataSource);
        }
        return bean;
    }

    public static class TenantRlsDataSource extends DelegatingDataSource {

        public TenantRlsDataSource(DataSource targetDataSource) {
            super(targetDataSource);
        }

        @Override
        @NonNull
        public Connection getConnection() throws SQLException {
            Connection connection = super.getConnection();
            return wrapConnection(connection);
        }

        @Override
        @NonNull
        public Connection getConnection(String username, String password) throws SQLException {
            Connection connection = super.getConnection(username, password);
            return wrapConnection(connection);
        }

        private Connection wrapConnection(Connection target) {
            return (Connection) Proxy.newProxyInstance(
                    target.getClass().getClassLoader(),
                    new Class<?>[]{Connection.class},
                    new TenantConnectionInvocationHandler(target)
            );
        }
    }

    private static class TenantConnectionInvocationHandler implements InvocationHandler {

        private final Connection target;
        private Boolean isPostgres;
        private boolean rlsInjected = false;

        public TenantConnectionInvocationHandler(Connection target) {
            this.target = target;
        }

        @Override
        public Object invoke(Object proxy, Method method, Object[] args) throws Throwable {
            String methodName = method.getName();

            if ("isClosed".equals(methodName)) {
                return target.isClosed();
            }

            if ("rollback".equals(methodName)) {
                try {
                    if (target.isClosed()) {
                        return null;
                    }
                } catch (Exception ignored) {
                    return null;
                }
            }

            if ("setAutoCommit".equals(methodName) && args != null && args.length == 1) {
                try {
                    Object result = method.invoke(target, args);
                    if (Boolean.FALSE.equals(args[0])) {
                        // Transaction began: inject SET LOCAL
                        applyTenantRls(true);
                    }
                    return result;
                } catch (InvocationTargetException ite) {
                    throw ite.getTargetException();
                }
            }

            if ("createStatement".equals(methodName) || "prepareStatement".equals(methodName)) {
                if (!rlsInjected) {
                    applyTenantRls(false);
                }
            }

            if ("close".equals(methodName)) {
                try {
                    if (!target.isClosed() && isPostgreSql() && target.getAutoCommit()) {
                        resetTenantRls();
                    }
                } catch (Exception ignored) {
                }
                rlsInjected = false;
            }

            try {
                return method.invoke(target, args);
            } catch (InvocationTargetException ite) {
                Throwable targetException = ite.getTargetException();
                if ("rollback".equals(methodName) && targetException instanceof SQLException) {
                    try {
                        if (target.isClosed()) {
                            return null;
                        }
                    } catch (Exception ignored) {
                        return null;
                    }
                }
                throw targetException;
            }
        }

        private boolean isPostgreSql() {
            if (isPostgres == null) {
                try {
                    if (!target.isClosed()) {
                        String db = target.getMetaData().getDatabaseProductName();
                        isPostgres = (db != null && db.toLowerCase().contains("postgres"));
                    } else {
                        return false;
                    }
                } catch (Exception e) {
                    isPostgres = false;
                }
            }
            return isPostgres;
        }

        private void applyTenantRls(boolean inTransaction) {
            try {
                if (target.isClosed() || !isPostgreSql()) {
                    rlsInjected = true;
                    return;
                }

                String value;
                if (TenantContext.isBypassRls()) {
                    value = "BYPASS_RLS";
                } else {
                    Long tenantId = TenantContext.getTenantId();
                    value = (tenantId != null) ? String.valueOf(tenantId) : "";
                }

                try (Statement stmt = target.createStatement()) {
                    if (inTransaction || !target.getAutoCommit()) {
                        stmt.execute("SET LOCAL app.current_tenant_id = '" + value + "'");
                    } else {
                        stmt.execute("SELECT set_config('app.current_tenant_id', '" + value + "', false)");
                    }
                }
                rlsInjected = true;
                log.trace("Applied PostgreSQL RLS current_tenant_id='{}'", value);
            } catch (Exception e) {
                log.debug("RLS session variable injection bypassed: {}", e.getMessage());
            }
        }

        private void resetTenantRls() {
            try {
                if (!target.isClosed()) {
                    try (Statement stmt = target.createStatement()) {
                        stmt.execute("SELECT set_config('app.current_tenant_id', '', false)");
                    }
                }
            } catch (Exception ignored) {
            }
        }
    }
}
