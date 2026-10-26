
package com.kiev.bstaymyapartament.client;

import com.kiev.bstaymyapartament.exception.ApartmentUnavailableException;
import com.kiev.bstaymyapartament.model.dto.BstayPriceResponse;
import com.microsoft.playwright.Browser;
import com.microsoft.playwright.BrowserContext;
import com.microsoft.playwright.BrowserType;
import com.microsoft.playwright.Page;
import com.microsoft.playwright.Playwright;
import com.microsoft.playwright.PlaywrightException;
import lombok.RequiredArgsConstructor;
import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.springframework.stereotype.Component;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class BstayClient {

    private static final String BASE_URL =
            "https://www.bstay.com.br/pt/apartment/";

    private static final String APARTMENT_ID = "XT29I";

    private static final String APARTMENT_SLUG =
            "send-rio-1404a-centro-vlt-e-cultura-carioca";

    private static final Pattern BRL_PATTERN =
            Pattern.compile("R\\$\\s*([\\d.]+,\\d{2})");

    private final ObjectMapper objectMapper;

    private Playwright playwright;
    private Browser browser;

    @PostConstruct
    public void startBrowser() {
        try {
            playwright = Playwright.create();

            browser = playwright.chromium().launch(
                    new BrowserType.LaunchOptions()
                            .setHeadless(true)
            );
        } catch (PlaywrightException e) {
            if (playwright != null) {
                playwright.close();
            }

            throw new IllegalStateException(
                    "Não foi possível iniciar o navegador da BStay.", e
            );
        }
    }

    @PreDestroy
    public void closeBrowser() {
        if (browser != null) {
            browser.close();
        }

        if (playwright != null) {
            playwright.close();
        }
    }

    public synchronized BstayPriceResponse getPrice(
            LocalDate checkIn,
            LocalDate checkOut,
            int guests
    ) throws IOException {

        validate(checkIn, checkOut, guests);

        String baseUrl = BASE_URL
                + APARTMENT_ID
                + "/"
                + APARTMENT_SLUG;

        String pageUrl = baseUrl
                + "?from=" + checkIn
                + "&to=" + checkOut
                + "&persons=" + guests;

        String priceUrl = pageUrl + "&forBooking=1&main=1";

        try (BrowserContext context = browser.newContext()) {
            Page page = context.newPage();

            page.navigate(pageUrl);

            String result = (String) page.evaluate("""
                                                           async (targetUrl) => {
                                                               const response = await fetch(targetUrl, {
                                                                   method: 'GET',
                                                                   headers: {
                                                                       'Accept': 'application/json',
                                                                       'X-Requested-With': 'XMLHttpRequest'
                                                                   }
                                                               });
                                                           
                                                               return JSON.stringify({
                                                                   status: response.status,
                                                                   contentType: response.headers.get('content-type'),
                                                                   body: await response.text()
                                                               });
                                                           }
                                                           """, priceUrl);

            JsonNode fetchResult = objectMapper.readTree(result);

            int status = fetchResult.path("status").asInt();
            String contentType =
                    fetchResult.path("contentType").asText("");
            String responseBody =
                    fetchResult.path("body").asText("");

            if (status != 200) {
                throw new IOException(
                        "BStay retornou HTTP " + status
                                + ". Content-Type: " + contentType
                );
            }

            if (!contentType.contains("application/json")) {
                throw new IOException(
                        "Resposta inesperada da BStay: " + contentType
                );
            }

            JsonNode root = objectMapper.readTree(responseBody);

            String panelBody = root.path("panelBody").asText("");
            String panelHeader = root.path("panelHeader").asText("");

            if (panelBody.contains("Esta acomodação não está disponível para o período da sua busca.")) {
                throw new ApartmentUnavailableException(
                        "O apartamento não está disponível para o período informado."
                );
            }

            if (panelBody.isBlank()) {
                throw new IOException(
                        "A resposta da BStay não contém panelBody."
                );
            }

            Document body = Jsoup.parseBodyFragment(panelBody);
            Document header = Jsoup.parseBodyFragment(panelHeader);

            BigDecimal subtotal = extractMoney(
                    body.selectFirst("#subtotal")
            );

            BigDecimal cleaningFee = extractCleaningFee(body);

            BigDecimal averageNightlyPrice = extractMoney(
                    header.selectFirst(".priceValue")
            );

            long nights = ChronoUnit.DAYS.between(checkIn, checkOut);

            return new BstayPriceResponse(
                    APARTMENT_ID,
                    checkIn,
                    checkOut,
                    guests,
                    nights,
                    averageNightlyPrice,
                    subtotal,
                    cleaningFee,
                    subtotal.add(cleaningFee)
            );
        } catch (PlaywrightException e) {
            throw new IOException(
                    "Falha ao consultar a BStay pelo navegador.", e
            );
        }
    }

    private BigDecimal extractCleaningFee(Document body)
            throws IOException {

        for (Element row : body.select(".row.my-3.text-muted")) {
            if (row.text().contains("Taxa de Limpeza")) {
                return extractMoney(row);
            }
        }

        return BigDecimal.ZERO;
    }

    private BigDecimal extractMoney(Element element)
            throws IOException {

        if (element == null) {
            throw new IOException(
                    "Não foi possível localizar o valor monetário."
            );
        }

        Matcher matcher = BRL_PATTERN.matcher(element.text());

        if (!matcher.find()) {
            throw new IOException(
                    "Não foi possível interpretar o valor: "
                            + element.text()
            );
        }

        String normalized = matcher.group(1)
                .replace(".", "")
                .replace(",", ".");

        return new BigDecimal(normalized);
    }

    private void validate(
            LocalDate checkIn,
            LocalDate checkOut,
            int guests
    ) {

        if (checkIn == null || checkOut == null) {
            throw new IllegalArgumentException(
                    "As datas são obrigatórias."
            );
        }

        if (!checkOut.isAfter(checkIn)) {
            throw new IllegalArgumentException(
                    "A data de saída deve ser posterior à data de entrada."
            );
        }

        if (guests < 1) {
            throw new IllegalArgumentException(
                    "A quantidade de hóspedes deve ser positiva."
            );
        }
    }
}
