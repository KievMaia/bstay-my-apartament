package com.kiev.bstaymyapartament.controller;

import com.kiev.bstaymyapartament.client.BstayClient;
import com.kiev.bstaymyapartament.model.dto.BstayPriceResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/prices")
@RequiredArgsConstructor
@Validated
public class BstayPriceController {

    private final BstayClient bstayClient;

    @GetMapping
    public BstayPriceResponse getPrice(
            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate checkIn,

            @RequestParam
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate checkOut,

            @RequestParam(defaultValue = "2")
            @Min(1)
            @Max(4)
            int guests
    ) throws IOException {

        return bstayClient.getPrice(checkIn, checkOut, guests);
    }
}