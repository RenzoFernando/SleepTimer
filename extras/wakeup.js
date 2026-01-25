document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------
    // Preferencias
    // -----------------------------
    const TIME_PREFERENCE_KEY = 'sleepTimer-wakeUpTime';
    const DELAY_PREFERENCE_KEY = 'sleepTimer-wakeUpDelay';

    // -----------------------------
    // DOM
    // -----------------------------
    const dateInput = document.getElementById('wake-up-date');
    const hourSelect = document.getElementById('hour-select');
    const minuteSelect = document.getElementById('minute-select');
    const ampmSelect = document.getElementById('ampm-select');
    const delayMinutesInput = document.getElementById('delay-minutes-input');
    const resultsContainer = document.getElementById('results-container');
    const generalInfoEl = document.getElementById('general-info');

    const toastEl = document.getElementById('toast');

    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalText = document.getElementById('info-modal-text');
    const closeInfoModalBtn = document.getElementById('close-info-modal-btn');

    // -----------------------------
    // Datos ciclos (mismo set que en la otra página para consistencia)
    // -----------------------------
    const CYCLES = [
        { title: 'Siesta rápida', description: 'Un ciclo (1.5h) es ideal para una siesta de poder: mejora estado de alerta y rendimiento cuando tienes poco tiempo.' },
        { title: 'Descanso corto', description: 'Dos ciclos (3h) ayudan a recuperar energía y memoria. Buena opción para una noche corta.' },
        { title: 'Sueño reparador', description: 'Tres ciclos (4.5h) incluyen fases profundas y REM. Es el mínimo razonable para no cortar REM.' },
        { title: 'Descanso aceptable', description: 'Cuatro ciclos (6h) proporcionan recuperación física y mental considerable.' },
        { title: 'Buen descanso', description: 'Cinco ciclos (7.5h) se acercan a la recomendación típica para adultos. Despertarás más fresco.' },
        { title: 'Descanso ideal', description: 'Seis ciclos (9h) es muy completo: recuperación profunda y un despertar normalmente más suave.' },
        { title: 'Sueño profundo', description: 'Siete ciclos (10.5h) pueden ayudar si vienes con deuda de sueño, entrenamiento intenso o recuperación.' },
        { title: 'Totalmente recuperado', description: 'Ocho ciclos (12h) es más de lo común, pero útil en periodos de descanso fuerte o convalecencia.' },
        { title: 'Máxima energía', description: 'Nueve ciclos (13.5h) es mucho para la mayoría, pero puede servir en recuperación muy intensa.' }
    ].map((c, idx) => ({
        ...c,
        cycles: idx + 1,
        durationMinutes: (idx + 1) * 90,
        durationHours: ((idx + 1) * 90) / 60
    }));

    // -----------------------------
    // Utils
    // -----------------------------
    const pad2 = (n) => String(n).padStart(2, '0');

    const formatTime = (date) =>
        date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    const formatHours = (hours) => {
        const fixed = Number.isInteger(hours) ? String(hours) : hours.toFixed(1);
        return fixed.replace('.0', '');
    };

    const lerp = (a, b, t) => a + (b - a) * t;

    const glowColorForCycle = (cycleNum) => {
        const t = (cycleNum - 1) / 8;
        if (t <= 0.5) {
            const tt = t / 0.5;
            const h = lerp(0, 50, tt);
            return `hsl(${h} 85% 55%)`;
        }
        const tt = (t - 0.5) / 0.5;
        const h = lerp(50, 120, tt);
        return `hsl(${h} 85% 50%)`;
    };

    const showToast = (message) => {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        toastEl.classList.remove('show');
        void toastEl.offsetWidth;
        toastEl.classList.add('show');

        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.classList.add('hidden'), 220);
        }, 1600);
    };

    const openModal = (modal) => {
        modal.classList.remove('hidden');
        const focusable = modal.querySelector('button');
        if (focusable) focusable.focus();
    };

    const closeModal = (modal) => modal.classList.add('hidden');

    // -----------------------------
    // Stars
    // -----------------------------
    const createStars = (count) => {
        const container = document.getElementById('stars-container');
        if (!container) return;
        container.innerHTML = '';
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';
            const size = Math.random() * 3 + 1;
            star.style.width = `${size}px`;
            star.style.height = `${size}px`;
            star.style.top = `${Math.random() * 100}%`;
            star.style.left = `${Math.random() * 100}%`;
            star.style.animationDelay = `${Math.random() * 5}s`;
            container.appendChild(star);
        }
    };

    // -----------------------------
    // Preferencias
    // -----------------------------
    const loadPreferences = () => {
        const savedTime = localStorage.getItem(TIME_PREFERENCE_KEY);
        if (savedTime) {
            try {
                const { hour, minute, ampm } = JSON.parse(savedTime);
                hourSelect.value = hour;
                minuteSelect.value = minute;
                ampmSelect.value = ampm;
            } catch { /* ignore */ }
        }

        const savedDelay = localStorage.getItem(DELAY_PREFERENCE_KEY);
        if (savedDelay !== null) delayMinutesInput.value = savedDelay;
    };

    const savePreferences = () => {
        const time = {
            hour: hourSelect.value,
            minute: minuteSelect.value,
            ampm: ampmSelect.value
        };
        localStorage.setItem(TIME_PREFERENCE_KEY, JSON.stringify(time));
        localStorage.setItem(DELAY_PREFERENCE_KEY, delayMinutesInput.value);
    };

    // -----------------------------
    // Selectores
    // -----------------------------
    const populateTimeSelectors = () => {
        hourSelect.innerHTML = '';
        minuteSelect.innerHTML = '';
        for (let i = 1; i <= 12; i++) {
            hourSelect.innerHTML += `<option value="${i}">${pad2(i)}</option>`;
        }
        for (let i = 0; i < 60; i += 5) {
            minuteSelect.innerHTML += `<option value="${i}">${pad2(i)}</option>`;
        }
    };

    const setDefaultDateTime = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        const yyyy = tomorrow.getFullYear();
        const mm = pad2(tomorrow.getMonth() + 1);
        const dd = pad2(tomorrow.getDate());
        dateInput.value = `${yyyy}-${mm}-${dd}`;

        hourSelect.value = '7';
        minuteSelect.value = '0';
        ampmSelect.value = 'AM';
    };

    // -----------------------------
    // Cálculo
    // -----------------------------
    const getWakeUpDateTime = () => {
        const [yyyy, mm, dd] = dateInput.value.split('-').map(Number);

        let hour = parseInt(hourSelect.value, 10);
        const minute = parseInt(minuteSelect.value, 10);
        const ampm = ampmSelect.value;

        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        return new Date(yyyy, mm - 1, dd, hour, minute, 0, 0);
    };

    const calculateBedTimes = (wakeUpTime, delayMinutes) => {
        return CYCLES.map((cycleData) => {
            const bedTime = new Date(
                wakeUpTime.getTime() -
                (cycleData.durationMinutes * 60 * 1000) -
                (delayMinutes * 60 * 1000)
            );
            return {
                cycle: cycleData.cycles,
                timeLabel: formatTime(bedTime),
                sleepHours: cycleData.durationHours,
                cycleTitle: cycleData.title,
                cycleDescription: cycleData.description
            };
        });
    };

    // -----------------------------
    // Render
    // -----------------------------
    const renderResults = (container, results, delayMinutes) => {
        container.innerHTML = '';
        results.forEach((result, index) => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.style.animationDelay = `${index * 70}ms`;
            card.style.setProperty('--glow-color', glowColorForCycle(result.cycle));

            card.innerHTML = `
        <div class="card-content">
          <div class="card-left">
            <span class="result-time" title="Toca para copiar" data-copy="${result.timeLabel}">${result.timeLabel}</span>
            <span class="result-meta">
              ${formatHours(result.sleepHours)}h · ${result.cycle} ciclo${result.cycle > 1 ? 's' : ''} · +${delayMinutes} min
            </span>
          </div>

          <div class="card-right">
            <div>
              <p class="result-label">${result.cycleTitle}</p>
              <p class="result-sub">Hora para acostarte</p>
            </div>

            <div class="card-actions">
              <button class="icon-button info-button" data-cycle="${result.cycle}" aria-label="Más información del ciclo">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;

            container.appendChild(card);
        });
    };

    const updateGeneralInfo = (delayMinutes) => {
        if (!generalInfoEl) return;
        generalInfoEl.textContent =
            `Restamos ciclos de 90 min desde tu hora de despertar. Aquí añadimos ${delayMinutes} min para conciliar el sueño. ` +
            `Elige la hora que te permita completar ciclos completos.`;
    };

    const updateApp = () => {
        const delayMinutes = parseInt(delayMinutesInput.value, 10) || 0;
        const wakeUpTime = getWakeUpDateTime();
        const bedTimeResults = calculateBedTimes(wakeUpTime, delayMinutes);

        renderResults(resultsContainer, bedTimeResults, delayMinutes);
        updateGeneralInfo(delayMinutes);
    };

    // -----------------------------
    // Copy
    // -----------------------------
    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                showToast('Hora copiada ✅');
            } else {
                window.prompt('Copia la hora:', text);
            }
        } catch {
            window.prompt('Copia la hora:', text);
        }
    };

    // -----------------------------
    // Info modal
    // -----------------------------
    const handleInfoClick = (cycle) => {
        const cycleData = CYCLES[cycle - 1];
        if (!cycleData) return;
        infoModalTitle.textContent = cycleData.title;
        infoModalText.textContent = cycleData.description;
        openModal(infoModal);
    };

    // -----------------------------
    // Listeners
    // -----------------------------
    const setupEventListeners = () => {
        [dateInput, hourSelect, minuteSelect, ampmSelect, delayMinutesInput].forEach((el) => {
            el.addEventListener('change', () => {
                updateApp();
                savePreferences();
            });
        });

        resultsContainer.addEventListener('click', (e) => {
            const infoBtn = e.target.closest('.info-button');
            if (infoBtn) {
                const cycle = parseInt(infoBtn.dataset.cycle, 10);
                handleInfoClick(cycle);
                return;
            }

            const copyEl = e.target.closest('[data-copy]');
            if (copyEl) {
                const value = copyEl.getAttribute('data-copy');
                if (value) copyToClipboard(value);
            }
        });

        if (closeInfoModalBtn) closeInfoModalBtn.addEventListener('click', () => closeModal(infoModal));
        if (infoModal) infoModal.addEventListener('click', (e) => e.target === infoModal && closeModal(infoModal));

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && infoModal && !infoModal.classList.contains('hidden')) closeModal(infoModal);
        });
    };

    // -----------------------------
    // Init
    // -----------------------------
    const init = () => {
        createStars(110);
        populateTimeSelectors();
        setDefaultDateTime();
        loadPreferences();
        setupEventListeners();
        updateApp();
    };

    init();
});
