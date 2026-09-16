package com.acrovix.admin.util;

import java.math.BigDecimal;
import java.math.BigInteger;

public class AmountToWordsConverter {

    private static final String[] units = {
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
            "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"
    };

    private static final String[] tens = {
            "", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"
    };

    public static String convert(BigDecimal amount) {
        if (amount == null || amount.compareTo(BigDecimal.ZERO) == 0) {
            return "Rupees Zero Only";
        }

        BigInteger rupees = amount.toBigInteger();
        BigInteger paise = amount.remainder(BigDecimal.ONE).multiply(new BigDecimal("100")).toBigInteger();

        String rupeesInWords = convertWholeNumber(rupees);
        String paiseInWords = paise.compareTo(BigInteger.ZERO) > 0 ? " and " + convertWholeNumber(paise) + " Paise" : "";

        return "Rupees " + rupeesInWords + paiseInWords + " Only";
    }

    private static String convertWholeNumber(BigInteger number) {
        if (number.compareTo(BigInteger.ZERO) == 0) {
            return "Zero";
        }

        long n = number.longValue();
        if (n < 0) {
            return "Minus " + convertWholeNumber(number.negate());
        }

        if (n < 20) {
            return units[(int) n];
        }

        if (n < 100) {
            return tens[(int) (n / 10)] + ((n % 10 != 0) ? " " + units[(int) (n % 10)] : "");
        }

        if (n < 1000) {
            return units[(int) (n / 100)] + " Hundred" + ((n % 100 != 0) ? " " + convertWholeNumber(BigInteger.valueOf(n % 100)) : "");
        }

        if (n < 100000) {
            return convertWholeNumber(BigInteger.valueOf(n / 1000)) + " Thousand" + ((n % 1000 != 0) ? " " + convertWholeNumber(BigInteger.valueOf(n % 1000)) : "");
        }

        if (n < 10000000) {
            return convertWholeNumber(BigInteger.valueOf(n / 100000)) + " Lakh" + ((n % 100000 != 0) ? " " + convertWholeNumber(BigInteger.valueOf(n % 100000)) : "");
        }

        return convertWholeNumber(BigInteger.valueOf(n / 10000000)) + " Crore" + ((n % 10000000 != 0) ? " " + convertWholeNumber(BigInteger.valueOf(n % 10000000)) : "");
    }
}
