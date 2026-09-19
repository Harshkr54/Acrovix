package com.acrovix.admin.exception;

public class RateLimitExceededException extends RuntimeException {
    private final long retryAfterSeconds;

    public RateLimitExceededException(String message, long retryAfterSeconds) {
        super(message);
        this.retryAfterSeconds = retryAfterSeconds;
    }

    public RateLimitExceededException(String message) {
        super(message);
        this.retryAfterSeconds = 60;
    }

    public long getRetryAfterSeconds() {
        return retryAfterSeconds;
    }
}
