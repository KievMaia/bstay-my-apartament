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
    checkIn.min = localDateString(new Date());

    const suggestedCheckIn = new Date();
    suggestedCheckIn.setHours(0, 0, 0, 0);
    suggestedCheckIn.setDate(suggestedCheckIn.getDate() + 7);

    const suggestedCheckOut = new Date(suggestedCheckIn);
    suggestedCheckOut.setDate(suggestedCheckOut.getDate() + 3);

    checkIn.value = localDateString(suggestedCheckIn);
    checkOut.min = checkIn.value;
    checkOut.value = localDateString(suggestedCheckOut);
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
    result.textContent = message;
    result.classList.remove('price-result-card');

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

    if (!checkIn.value || checkIn.value < today) {
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
    consultButton.textContent = 'Consultando...';

    showMessage('Consultando disponibilidade e preços...', false);

    try {
        const response = await fetch(`/api/prices?${params}`);
        const data = await response.json();

        if (response.status === 409) {
            showMessage(
                'Esse período não está disponível. Escolha outras datas.'
            );
            return;
        }

        if (!response.ok) {
            showMessage(
                data.detail ||
                'Não foi possível consultar os preços. Tente novamente.'
            );
            return;
        }

        showPriceSummary(data, Number(guests));

    } catch {
        showMessage(
            'Não foi possível conectar ao serviço. Tente novamente.'
        );

    } finally {
        consultButton.disabled = false;
        consultButton.textContent = 'Consultar preços';
    }
});
