package com.acrovix.admin.repository;

import com.acrovix.admin.entity.EmailLog;
import com.acrovix.admin.entity.EmailType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface EmailLogRepository extends JpaRepository<EmailLog, Long> {
    List<EmailLog> findByRecipient(String recipient);
    List<EmailLog> findByEmailType(EmailType emailType);
}
