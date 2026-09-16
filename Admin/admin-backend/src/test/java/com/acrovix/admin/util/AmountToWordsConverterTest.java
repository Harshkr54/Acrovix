package com.acrovix.admin.util;

import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.assertEquals;

public class AmountToWordsConverterTest {

    @Test
    void testZero() {
        assertEquals("Rupees Zero Only", AmountToWordsConverter.convert(BigDecimal.ZERO));
    }

    @Test
    void testHundreds() {
        assertEquals("Rupees One Hundred Only", AmountToWordsConverter.convert(new BigDecimal("100")));
        assertEquals("Rupees Nine Hundred Ninety Nine Only", AmountToWordsConverter.convert(new BigDecimal("999")));
    }

    @Test
    void testThousands() {
        assertEquals("Rupees One Thousand Only", AmountToWordsConverter.convert(new BigDecimal("1000")));
        assertEquals("Rupees Ten Thousand Five Hundred Only", AmountToWordsConverter.convert(new BigDecimal("10500")));
    }

    @Test
    void testLakhsAndCrores() {
        assertEquals("Rupees One Lakh Only", AmountToWordsConverter.convert(new BigDecimal("100000")));
        assertEquals("Rupees One Crore Only", AmountToWordsConverter.convert(new BigDecimal("10000000")));
        assertEquals("Rupees Twelve Lakh Thirty Four Thousand Five Hundred Sixty Seven Only", AmountToWordsConverter.convert(new BigDecimal("1234567")));
    }

    @Test
    void testPaise() {
        assertEquals("Rupees One Hundred and Fifty Paise Only", AmountToWordsConverter.convert(new BigDecimal("100.50")));
        assertEquals("Rupees Zero and Ninety Nine Paise Only", AmountToWordsConverter.convert(new BigDecimal("0.99")));
    }
}
