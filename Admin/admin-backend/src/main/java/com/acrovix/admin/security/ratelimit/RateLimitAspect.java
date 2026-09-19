package com.acrovix.admin.security.ratelimit;

import com.acrovix.admin.entity.AdminUser;
import com.acrovix.admin.exception.RateLimitExceededException;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

@Aspect
@Component
@RequiredArgsConstructor
public class RateLimitAspect {

    private final ApiRateLimiterService rateLimiterService;

    @Around("@annotation(rateLimit)")
    public Object enforceRateLimit(ProceedingJoinPoint pjp, RateLimit rateLimit) throws Throwable {
        HttpServletRequest request = ((ServletRequestAttributes) RequestContextHolder.currentRequestAttributes()).getRequest();
        
        String key = generateKey(request, rateLimit.category());
        
        if (!rateLimiterService.tryConsume(key, rateLimit.category())) {
            long retryAfter = rateLimiterService.getRetryAfterSeconds(key);
            throw new RateLimitExceededException("Too many requests. Please try again later.", retryAfter);
        }

        return pjp.proceed();
    }

    private String generateKey(HttpServletRequest request, RateLimitCategory category) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (category == RateLimitCategory.PUBLIC) {
            String ip = request.getRemoteAddr();
            return "PUBLIC:" + request.getRequestURI() + ":" + ip;
        }
        
        if (auth != null && auth.getPrincipal() instanceof AdminUser adminUser) {
            return category.name() + ":" + adminUser.getId();
        }
        
        // Fallback
        return category.name() + ":" + request.getRemoteAddr();
    }
}
