package com.acrovix.admin.security.ratelimit;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ApiRateLimiterService {

    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();
    private static final int MAX_CACHE_SIZE = 50000;

    @Value("${acrovix.security.rate-limit.enabled:true}")
    private boolean enabled;

    @Value("${acrovix.security.rate-limit.public.requests-per-minute:10}")
    private int publicRpm;

    @Value("${acrovix.security.rate-limit.email.requests-per-minute:3}")
    private int emailRpm;

    @Value("${acrovix.security.rate-limit.ai.requests-per-minute:10}")
    private int aiRpm;

    @Value("${acrovix.security.rate-limit.pdf.requests-per-minute:20}")
    private int pdfRpm;

    @Value("${acrovix.security.rate-limit.export.requests-per-minute:10}")
    private int exportRpm;

    @Value("${acrovix.security.rate-limit.default.requests-per-minute:-1}")
    private int defaultRpm;

    public boolean tryConsume(String key, RateLimitCategory category) {
        if (!enabled) return true;
        
        int maxRequests = getMaxRequestsForCategory(category);
        if (maxRequests <= 0) return true;

        cleanUpIfNeeded();

        TokenBucket bucket = buckets.computeIfAbsent(key, k -> new TokenBucket(maxRequests));
        return bucket.tryConsume(maxRequests);
    }
    
    public long getRetryAfterSeconds(String key) {
        return 60L; 
    }

    private int getMaxRequestsForCategory(RateLimitCategory category) {
        return switch (category) {
            case PUBLIC -> publicRpm;
            case EMAIL -> emailRpm;
            case AI -> aiRpm;
            case PDF -> pdfRpm;
            case EXPORT -> exportRpm;
            case LOGIN -> -1;
            default -> defaultRpm;
        };
    }

    private void cleanUpIfNeeded() {
        if (buckets.size() > MAX_CACHE_SIZE) {
            long now = Instant.now().toEpochMilli();
            Iterator<Map.Entry<String, TokenBucket>> it = buckets.entrySet().iterator();
            while (it.hasNext()) {
                Map.Entry<String, TokenBucket> entry = it.next();
                if (now - entry.getValue().lastRefillTime > 60000) {
                    it.remove();
                }
            }
        }
    }

    private static class TokenBucket {
        private int tokens;
        private long lastRefillTime;

        public TokenBucket(int maxTokens) {
            this.tokens = maxTokens;
            this.lastRefillTime = Instant.now().toEpochMilli();
        }

        public synchronized boolean tryConsume(int maxTokens) {
            long now = Instant.now().toEpochMilli();
            long timeElapsed = now - lastRefillTime;

            if (timeElapsed > 60000) {
                long periods = timeElapsed / 60000;
                tokens = Math.min(maxTokens, tokens + (int)(periods * maxTokens));
                lastRefillTime += periods * 60000;
            }

            if (tokens > 0) {
                tokens--;
                return true;
            }
            return false;
        }
    }
}
