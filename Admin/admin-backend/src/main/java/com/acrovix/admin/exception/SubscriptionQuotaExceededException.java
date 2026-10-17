package com.acrovix.admin.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.PAYMENT_REQUIRED)
public class SubscriptionQuotaExceededException extends RuntimeException {

    private final HttpStatus status;

    public SubscriptionQuotaExceededException(String message) {
        super(message);
        this.status = HttpStatus.PAYMENT_REQUIRED;
    }

    public SubscriptionQuotaExceededException(String message, HttpStatus status) {
        super(message);
        this.status = status != null ? status : HttpStatus.PAYMENT_REQUIRED;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
