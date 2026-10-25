package com.kiev.bstaymyapartament.model.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

public record BstayPriceResponse(
        String apartmentId,
        LocalDate checkIn,
        LocalDate checkOut,
        int guests,
        long nights,
        BigDecimal averageNightlyPrice,
        BigDecimal accommodationSubtotal,
        BigDecimal cleaningFee,
        BigDecimal total
) {
}