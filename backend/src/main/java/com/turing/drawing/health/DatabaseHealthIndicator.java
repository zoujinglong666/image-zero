package com.turing.drawing.health;

import org.springframework.boot.actuate.health.Health;
import org.springframework.boot.actuate.health.HealthIndicator;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.SQLException;

/**
 * 数据库健康检查指标
 */
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    @Autowired
    private DataSource dataSource;

    @Override
    public Health health() {
        try (Connection connection = dataSource.getConnection()) {
            if (connection.isValid(5)) {
                return Health.up()
                        .withDetail("database", "MySQL")
                        .withDetail("status", "Connected")
                        .build();
            } else {
                return Health.down()
                        .withDetail("database", "MySQL")
                        .withDetail("status", "Invalid connection")
                        .build();
            }
        } catch (SQLException e) {
            return Health.down()
                    .withDetail("database", "MySQL")
                    .withDetail("error", e.getMessage())
                    .build();
        }
    }
}