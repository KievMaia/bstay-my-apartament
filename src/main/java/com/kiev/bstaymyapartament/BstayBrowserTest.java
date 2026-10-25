
package com.kiev.bstaymyapartament;

import com.microsoft.playwright.*;
import com.microsoft.playwright.options.LoadState;

public class BstayBrowserTest {

    public static void main(String[] args) {
        String baseUrl =
                "https://www.bstay.com.br/pt/apartment/"
                        + "XT29I/send-rio-1404a-centro-vlt-e-cultura-carioca";

        String pageUrl = baseUrl
                + "?from=2026-11-03"
                + "&to=2026-11-07"
                + "&persons=4";

        String priceUrl = baseUrl
                + "?from=2026-11-03"
                + "&to=2026-11-28"
                + "&persons=4"
                + "&forBooking=1&main=1";

        try (Playwright playwright = Playwright.create()) {
            Browser browser = playwright.chromium().launch(
                    new BrowserType.LaunchOptions()
                            .setHeadless(false)
            );

            try {
                BrowserContext context = browser.newContext();
                Page page = context.newPage();

                // Abre a página para que o próprio site
                // estabeleça a sessão e os dados necessários.
                page.navigate(pageUrl);
                page.waitForLoadState(LoadState.DOMCONTENTLOADED);

                // Consulta o endpoint dentro do navegador.
                String result = (String) page.evaluate("""
                    async (targetUrl) => {
                        const response = await fetch(targetUrl, {
                            method: 'GET',
                            headers: {
                                'Accept': 'application/json',
                                'X-Requested-With': 'XMLHttpRequest'
                            }
                        });

                        const body = await response.text();

                        return JSON.stringify({
                            status: response.status,
                            contentType:
                                response.headers.get('content-type'),
                            body: body.substring(0, 1000)
                        });
                    }
                    """, priceUrl);

                System.out.println("===== TESTE BSTAY =====");
                System.out.println(result);
                System.out.println("=======================");

                context.close();
            } finally {
                browser.close();
            }
        }
    }
}
