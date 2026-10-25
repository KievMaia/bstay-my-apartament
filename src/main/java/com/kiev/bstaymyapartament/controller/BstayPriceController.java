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
            @Min(value = 1, message = "A quantidade de hóspedes deve ser de no mínimo 1 e no máximo 4.")
            @Max(value = 4, message = "A quantidade de hóspedes deve ser de no mínimo 1 e no máximo 4.")
            Integer guests
    ) throws IOException {

        return bstayClient.getPrice(checkIn, checkOut, guests);
    }
}