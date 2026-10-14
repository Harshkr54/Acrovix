package com.acrovix.admin.dto.email;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailDispatchResult {
    public enum Status {
        ACCEPTED,
        FAILED,
        UNCONFIGURED
    }

    private Status status;
    private String message;
    private String providerMessageId;

    public static EmailDispatchResult accepted(String message) {
        return EmailDispatchResult.builder()
                .status(Status.ACCEPTED)
                .message(message)
                .build();
    }

    public static EmailDispatchResult failed(String message) {
        return EmailDispatchResult.builder()
                .status(Status.FAILED)
                .message(message)
                .build();
    }

    public static EmailDispatchResult unconfigured(String message) {
        return EmailDispatchResult.builder()
                .status(Status.UNCONFIGURED)
                .message(message)
                .build();
    }

    public boolean isSuccess() {
        return this.status == Status.ACCEPTED;
    }
}
