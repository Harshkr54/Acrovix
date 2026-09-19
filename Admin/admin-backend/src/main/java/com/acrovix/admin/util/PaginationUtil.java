package com.acrovix.admin.util;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class PaginationUtil {

    private static int MAX_PAGE_SIZE = 100;
    private static int MAX_SEARCH_LENGTH = 200;

    @Value("${acrovix.security.pagination.max-size:100}")
    public void setMaxPageSize(int maxPageSize) {
        PaginationUtil.MAX_PAGE_SIZE = maxPageSize;
    }

    @Value("${acrovix.security.search.max-length:200}")
    public void setMaxSearchLength(int maxSearchLength) {
        PaginationUtil.MAX_SEARCH_LENGTH = maxSearchLength;
    }

    public static int getSafeSize(int size) {
        if (size < 1) return 10;
        return Math.min(size, MAX_PAGE_SIZE);
    }

    public static String getSafeSearch(String search) {
        if (search == null) return null;
        String trimmed = search.trim();
        if (trimmed.length() > MAX_SEARCH_LENGTH) {
            return trimmed.substring(0, MAX_SEARCH_LENGTH);
        }
        return trimmed;
    }
}
