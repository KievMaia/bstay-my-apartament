const checkIn = document.getElementById('checkIn');
const checkOut = document.getElementById('checkOut');
const form = document.getElementById('reservar');
const result = document.getElementById('priceResult');
const consultButton = document.getElementById('consultButton');

function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

function configureDateFields() {
    const today = localDateString(new Date());

    const suggestedCheckIn = new Date();
    suggestedCheckIn.setHours(0, 0, 0, 0);
    suggestedCheckIn.setDate(suggestedCheckIn.getDate() + 7);

    const suggestedCheckOut = new Date(suggestedCheckIn);
    suggestedCheckOut.setDate(suggestedCheckOut.getDate() + 3);

    checkIn.value = localDateString(suggestedCheckIn);
    checkOut.value = localDateString(suggestedCheckOut);

    checkOut.min = checkIn.value;

    const checkOutPicker = flatpickr(checkOut, {
        locale: 'pt',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd/m/Y',
        minDate: checkIn.value,
        defaultDate: checkOut.value,
        disableMobile: true,
        onChange(selectedDates) {
            if (
                selectedDates.length &&
                checkIn.value &&
                localDateString(selectedDates[0]) <= checkIn.value
            ) {
                checkOutPicker.clear();
            }
        }
    });

    flatpickr(checkIn, {
        locale: 'pt',
        dateFormat: 'Y-m-d',
        altInput: true,
        altFormat: 'd/m/Y',
        minDate: today,
        defaultDate: checkIn.value,
        disableMobile: true,
        onChange(selectedDates) {
            if (!selectedDates.length) {
                return;
            }

            const selectedCheckIn = localDateString(selectedDates[0]);

            checkOutPicker.set('minDate', selectedCheckIn);

            if (
                checkOut.value &&
                checkOut.value <= selectedCheckIn
            ) {
                checkOutPicker.clear();
            }
        }
    });
}

configureDateFields();

checkIn.addEventListener('change', () => {
    const today = localDateString(new Date());

    checkIn.min = today;
    checkOut.min = checkIn.value || today;

    if (checkOut.value && checkOut.value <= checkIn.value) {
        checkOut.value = '';
    }
});

checkOut.addEventListener('change', () => {
    checkOut.min = checkIn.value || localDateString(new Date());
});

function formatMoney(value) {
    return Number(value).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    });
}

function formatDate(value) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, day);

    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}

function showMessage(message, scroll = true) {
    result.hidden = false;
    result.classList.remove('price-result-card');
    result.classList.add('price-result-message');
    result.textContent = message;

    if (scroll) {
        result.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function showLoadingMessage(scroll = false) {
    result.hidden = false;
    result.classList.remove('price-result-message');
    result.classList.add('price-result-card');

    result.innerHTML = `
        <div class="price-loading" role="status" aria-live="polite">
            <span class="result-spinner" aria-hidden="true"></span>
            <div class="price-loading-text">
                <strong>Consultando disponibilidade e preços</strong>
                <p>Estamos verificando os valores para o período selecionado.</p>
                <p class="price-loading-note">
                    Isso pode levar alguns instantes.
                </p>
            </div>
        </div>
    `;

    if (scroll) {
        result.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
}

function showPriceSummary(data, guests) {
    const nights = Number(data.nights);

    if (
        !Number.isFinite(nights) || nights <= 0 ||
        !Number.isFinite(Number(data.averageNightlyPrice)) ||
        !Number.isFinite(Number(data.accommodationSubtotal)) ||
        !Number.isFinite(Number(data.cleaningFee)) ||
        !Number.isFinite(Number(data.total))
    ) {
        showMessage(
            'A consulta retornou valores inválidos. Tente novamente.'
        );
        return;
    }

    result.hidden = false;
    result.classList.remove('price-result-message');
    result.classList.add('price-result-card');

    result.innerHTML = `
        <div class="price-heading">
            <div>
                <span class="eyebrow">Sua estadia</span>
                <h2>Resumo dos preços</h2>

                <p class="price-dates">
                    ${formatDate(checkIn.value)} – ${formatDate(checkOut.value)}
                </p>

                <p class="price-guests">
                    ${guests} ${guests === 1 ? 'hóspede' : 'hóspedes'}
                    · ${nights} ${nights === 1 ? 'noite' : 'noites'}
                </p>
            </div>
        </div>

        <div class="price-line">
            <span>Diária média</span>
            <strong>${formatMoney(data.averageNightlyPrice)}</strong>
        </div>

        <div class="price-line">
            <span>
                Hospedagem (${nights} ${nights === 1 ? 'noite' : 'noites'})
            </span>
            <strong>${formatMoney(data.accommodationSubtotal)}</strong>
        </div>

        <div class="price-total">
            <span>Total da hospedagem</span>
            <strong>${formatMoney(data.accommodationSubtotal)}</strong>
        </div>

        <p class="price-excluded-fee">
            (Taxa de limpeza de ${formatMoney(data.cleaningFee)} não inclusa)
        </p>

        <p class="price-note">
            Valores referentes ao período consultado.
            A consulta não confirma uma reserva.
        </p>
    `;

    result.scrollIntoView({
        behavior: 'smooth',
        block: 'center'
    });
}

const today = new Date();
today.setHours(0, 0, 0, 0);

// Consulta de disponibilidade e preços.
form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!checkIn.value || checkIn.value < localDateString(today)) {
        showMessage('Informe uma data de entrada válida.');
        return;
    }

    if (!checkOut.value || checkOut.value <= checkIn.value) {
        showMessage('A data de saída deve ser posterior à entrada.');
        return;
    }

    const guests = document.getElementById('guests').value;

    const params = new URLSearchParams({
        checkIn: checkIn.value,
        checkOut: checkOut.value,
        guests
    });

    consultButton.disabled = true;
    consultButton.setAttribute('aria-busy', 'true');

    consultButton.innerHTML = `
        <span class="button-spinner" aria-hidden="true"></span>
        <span>Consultando preços...</span>
    `;

    showLoadingMessage();

    try {
        const response = await fetch(`/api/prices?${params}`);

        let data;

        try {
            data = await response.json();
        } catch {
            showMessage(
                'O serviço retornou uma resposta inesperada. Tente novamente.'
            );
            return;
        }

        if (response.status === 409) {
            showMessage(
                'Esse período não está disponível. Escolha outras datas.'
            );
            return;
        }

        if (response.status === 400) {
            showMessage(
                data.detail ||
                'Confira as datas e o número de hóspedes informados.'
            );
            return;
        }

        if (response.status === 502) {
            showMessage(
                'Não foi possível obter uma resposta válida da integração. Tente novamente em instantes.'
            );
            return;
        }

        if (!response.ok) {
            showMessage(
                data.detail ||
                'Ocorreu uma falha ao consultar os preços. Tente novamente.'
            );
            return;
        }

        showPriceSummary(data, Number(guests));

    } catch {
        showMessage(
            'Não foi possível conectar ao serviço. Verifique sua conexão e tente novamente.'
        );

    } finally {
        consultButton.disabled = false;
        consultButton.removeAttribute('aria-busy');
        consultButton.textContent = 'Consultar preços';
    }
});

// ============================================
// Carrossel horizontal e visualizador de fotos
// ============================================

const gallery = document.getElementById('gallery');
const galleryTrack = document.getElementById('galleryTrack');
const galleryViewport = document.getElementById('galleryViewport');
const galleryPrev = document.getElementById('galleryPrev');
const galleryNext = document.getElementById('galleryNext');

const lightbox = document.getElementById('lightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const lightboxCounter = document.getElementById('lightboxCounter');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxPrev = document.getElementById('lightboxPrev');
const lightboxNext = document.getElementById('lightboxNext');

// Todas as imagens disponíveis no visualizador.
const galleryImages = [
    {file: 'Principal.png', alt: 'Vista principal do apartamento'},
    {file: 'Cama.png', alt: 'Cama do apartamento'},
    {file: 'Sofá cama.png', alt: 'Sofá-cama do apartamento'},
    {file: 'Apto.png', alt: 'Apartamento'},
    {file: 'Apto 2.png', alt: 'Apartamento 2'},
    {file: 'Cozinha.png', alt: 'Cozinha equipada'},
    {file: 'Cozinha 2.png', alt: 'Cozinha do apartamento'},
    {file: 'Banheiro.png', alt: 'Banheiro do apartamento'},
    {file: 'Banheiro 2.png', alt: 'Detalhes do banheiro'},
    {file: 'Banheiro 3.png', alt: 'Outro ângulo do banheiro'},
    {file: 'Banheiro 4.png', alt: 'Instalações do banheiro'},
    {file: 'Banheiro 5.png', alt: 'Mais detalhes do banheiro'},
    {file: 'Convivência.png', alt: 'Área de convivência'},
    {file: 'Convivência 2.png', alt: 'Espaço de convivência do edifício'},
    {file: 'Convivência 3.png', alt: 'Ambiente de convivência'},
    {file: 'Convivência 4.png', alt: 'Área comum do condomínio'},
    {file: 'Convivência 5.png', alt: 'Detalhes da área comum'},
    {file: 'Convivência 6.png', alt: 'Mais um espaço de convivência'},
    {file: 'Convivência 7.png', alt: 'Outro ambiente compartilhado'},
    {file: 'Academia.png', alt: 'Academia do edifício'},
    {file: 'Elevadores.png', alt: 'Elevadores do edifício'},
    {file: 'Elevadores 2.png', alt: 'Área dos elevadores'},
    {file: 'Fachada Send.png', alt: 'Fachada do edifício Send Rio'},
    {file: 'Jardim.png', alt: 'Jardim do condomínio'},
    {file: 'Lavanderia.png', alt: 'Lavanderia do edifício'},
    {file: 'Roof top.png', alt: 'Rooftop do edifício'},
    {file: 'Roof top 2.png', alt: 'Outro ângulo do rooftop'},
    {file: 'Sauna.png', alt: 'Sauna do edifício'},
    {file: 'Avisos.png', alt: 'Avisos e informações do edifício'}
].map(image => ({
    ...image,
    src: `/images/${encodeURIComponent(image.file)}`
}));

// Cria os slides automaticamente a partir da lista acima.
galleryImages.forEach((image, index) => {
    const button = document.createElement('button');

    button.className = 'gallery-item';
    button.type = 'button';
    button.dataset.index = index;
    button.setAttribute('aria-label', `Ampliar foto: ${image.alt}`);

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.alt;
    img.loading = index === 0 ? 'eager' : 'lazy';

    button.appendChild(img);
    galleryTrack.appendChild(button);
});

let currentImageIndex = 0;
let lastFocusedElement = null;

function updateLightbox() {
    const image = galleryImages[currentImageIndex];

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxCaption.textContent = image.alt;

    lightboxCounter.textContent =
        `${currentImageIndex + 1} de ${galleryImages.length}`;

    lightboxPrev.disabled = galleryImages.length < 2;
    lightboxNext.disabled = galleryImages.length < 2;
}

function openLightbox(index) {
    currentImageIndex = index;
    lastFocusedElement = document.activeElement;

    updateLightbox();

    lightbox.hidden = false;
    document.body.style.overflow = 'hidden';

    lightboxClose.focus();
}

function closeLightbox() {
    lightbox.hidden = true;
    document.body.style.overflow = '';

    if (lastFocusedElement) {
        lastFocusedElement.focus();
    }
}

function navigateLightbox(direction) {
    currentImageIndex =
        (currentImageIndex + direction + galleryImages.length)
        % galleryImages.length;

    updateLightbox();
}

// Clicar em uma foto abre a versão ampliada.
gallery.addEventListener('click', (event) => {
    const button = event.target.closest('.gallery-item');

    if (!button) {
        return;
    }

    openLightbox(Number(button.dataset.index));
});

// Setas do carrossel horizontal.
galleryPrev.addEventListener('click', () => {
    galleryViewport.scrollBy({
        left: -galleryViewport.clientWidth * 0.8,
        behavior: 'smooth'
    });
});

galleryNext.addEventListener('click', () => {
    galleryViewport.scrollBy({
        left: galleryViewport.clientWidth * 0.8,
        behavior: 'smooth'
    });
});

// Setas do visualizador ampliado.
lightboxClose.addEventListener('click', closeLightbox);

lightboxPrev.addEventListener('click', () => {
    navigateLightbox(-1);
});

lightboxNext.addEventListener('click', () => {
    navigateLightbox(1);
});

// Clicar no fundo escuro fecha o visualizador.
lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
        closeLightbox();
    }
});

// Teclado: Esc fecha; setas navegam na ampliação.
document.addEventListener('keydown', (event) => {
    if (lightbox.hidden) {
        return;
    }

    if (event.key === 'Escape') {
        closeLightbox();
    } else if (event.key === 'ArrowLeft') {
        navigateLightbox(-1);
    } else if (event.key === 'ArrowRight') {
        navigateLightbox(1);
    }
});
