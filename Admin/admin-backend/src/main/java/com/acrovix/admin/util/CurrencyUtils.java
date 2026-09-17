package com.acrovix.admin.util;

import com.acrovix.admin.entity.Currency;
import java.math.BigDecimal;
import java.text.DecimalFormat;

public class CurrencyUtils {

    public static String formatCurrency(BigDecimal amount, Currency currency) {
        if (amount == null) {
            amount = BigDecimal.ZERO;
        }
        Currency curr = currency != null ? currency : Currency.INR;
        String symbol = (curr == Currency.USD) ? "$" : "₹";
        DecimalFormat df = new DecimalFormat("#,##0.00");
        return symbol + df.format(amount);
    }
}
