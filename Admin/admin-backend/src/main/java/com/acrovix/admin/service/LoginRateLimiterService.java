package com.acrovix.admin.service;

import org.springframework.stereotype.Service;
import java.util.concurrent.ConcurrentHashMap;
import java.time.LocalDateTime;

@Service
public class LoginRateLimiterService {
    private static final int MAX_ATTEMPTS = 5;
    private static final int LOCK_TIME_MINUTES = 1;

    private final ConcurrentHashMap<String, LoginAttempt> attemptsCache = new ConcurrentHashMap<>();

    public boolean isRateLimited(String ip) {
        LoginAttempt attempt = attemptsCache.get(ip);
        if (attempt == null) {
            return false;
        }
        if (attempt.getAttempts() >= MAX_ATTEMPTS) {
            if (attempt.getLastAttempt().plusMinutes(LOCK_TIME_MINUTES).isAfter(LocalDateTime.now())) {
                return true;
            } else {
                attemptsCache.remove(ip);
                return false;
            }
        }
        return false;
    }

    public void loginSucceeded(String ip) {
        attemptsCache.remove(ip);
    }

    public void loginFailed(String ip) {
        attemptsCache.compute(ip, (key, attempt) -> {
            if (attempt == null) {
                return new LoginAttempt(1, LocalDateTime.now());
            } else {
                if (attempt.getLastAttempt().plusMinutes(LOCK_TIME_MINUTES).isBefore(LocalDateTime.now())) {
                    return new LoginAttempt(1, LocalDateTime.now());
                } else {
                    attempt.setAttempts(attempt.getAttempts() + 1);
                    attempt.setLastAttempt(LocalDateTime.now());
                    return attempt;
                }
            }
        });
        
        if (attemptsCache.size() > 10000) {
            attemptsCache.clear();
        }
    }

    private static class LoginAttempt {
        private int attempts;
        private LocalDateTime lastAttempt;

        public LoginAttempt(int attempts, LocalDateTime lastAttempt) {
            this.attempts = attempts;
            this.lastAttempt = lastAttempt;
        }

        public int getAttempts() { return attempts; }
        public void setAttempts(int attempts) { this.attempts = attempts; }
        public LocalDateTime getLastAttempt() { return lastAttempt; }
        public void setLastAttempt(LocalDateTime lastAttempt) { this.lastAttempt = lastAttempt; }
    }
}
