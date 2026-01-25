document.addEventListener('DOMContentLoaded', () => {
    // -----------------------------
    // Preferencias
    // -----------------------------
    const PREFERENCE_DELAY_KEY = 'sleepTimer-delayMinutes';
    const PREFERENCE_BASE_TIME_KEY = 'sleepTimer-baseTime'; // { mode: 'auto'|'manual', hour, minute, ampm }

    // -----------------------------
    // DOM
    // -----------------------------
    const subtitleEl = document.getElementById('subtitle');
    const currentTimeEl = document.getElementById('current-time');
    const resultsContainer = document.getElementById('results-container');
    const delayMinutesInput = document.getElementById('delay-minutes-input');
    const generalInfoEl = document.getElementById('general-info');

    const toastEl = document.getElementById('toast');

    const timePickerModal = document.getElementById('time-picker-modal');
    const openModalBtn = document.getElementById('open-time-modal-btn');
    const confirmTimeBtn = document.getElementById('confirm-time-btn');
    const useCurrentTimeBtn = document.getElementById('use-current-time-btn');
    const hourSelect = document.getElementById('hour-select');
    const minuteSelect = document.getElementById('minute-select');
    const ampmSelect = document.getElementById('ampm-select');

    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalText = document.getElementById('info-modal-text');
    const closeInfoModalBtn = document.getElementById('close-info-modal-btn');

    // -----------------------------
    // Estado
    // -----------------------------
    let timerInterval = null;
    let baseTime = new Date();

    // -----------------------------
    // Datos de ciclos (1..9)
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

    // Gradiente 9 pasos: rojo -> amarillo -> verde (HSL)
    const glowColorForCycle = (cycleNum) => {
        const t = (cycleNum - 1) / 8; // 0..1
        if (t <= 0.5) {
            const tt = t / 0.5; // 0..1
            const h = lerp(0, 50, tt);
            return `hsl(${h} 85% 55%)`;
        }
        const tt = (t - 0.5) / 0.5; // 0..1
        const h = lerp(50, 120, tt);
        return `hsl(${h} 85% 50%)`;
    };

    const showToast = (message) => {
        if (!toastEl) return;
        toastEl.textContent = message;
        toastEl.classList.remove('hidden');
        // Reinicia animación
        toastEl.classList.remove('show');
        void toastEl.offsetWidth;
        toastEl.classList.add('show');

        clearTimeout(showToast._t);
        showToast._t = setTimeout(() => {
            toastEl.classList.remove('show');
            setTimeout(() => toastEl.classList.add('hidden'), 220);
        }, 1600);
    };

    const isAndroid = () => /Android/i.test(navigator.userAgent);
    const isSamsung = () => /Samsung|SM-|GT-|SCH-|SGH-|Galaxy/i.test(navigator.userAgent);

    const openAndroidAlarm = (hour24, minute, label) => {
        if (!isAndroid()) {
            showToast('Abrir alarma: disponible en Android.');
            return;
        }

        // Intent estándar: abre el Reloj en "crear alarma" con hora/minuto prellenados.
        // Nota: por seguridad, la mayoría de relojes igual pide tocar "Guardar" / "Activar".
        const packagePart = isSamsung() ? ';package=com.sec.android.app.clockpackage' : '';

        const intentUrl =
            'intent://alarm#Intent' +
            ';action=android.intent.action.SET_ALARM' +
            packagePart +
            `;S.android.intent.extra.alarm.MESSAGE=${encodeURIComponent(label || 'SleepTimer')}` +
            `;i.android.intent.extra.alarm.HOUR=${Number(hour24)}` +
            `;i.android.intent.extra.alarm.MINUTES=${Number(minute)}` +
            ';end';

        window.location.href = intentUrl;
    };

    const openModal = (modal) => {
        modal.classList.remove('hidden');

        // foco al primer control
        const focusable = modal.querySelector('select, input, button');
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
        const savedDelay = localStorage.getItem(PREFERENCE_DELAY_KEY);
        if (savedDelay !== null) delayMinutesInput.value = savedDelay;

        const savedBase = localStorage.getItem(PREFERENCE_BASE_TIME_KEY);
        if (savedBase) {
            try {
                const parsed = JSON.parse(savedBase);
                if (parsed?.mode === 'manual') {
                    setBaseTimeFromParts(parsed.hour, parsed.minute, parsed.ampm);
                    stopAutoUpdate();
                } else {
                    startAutoUpdate();
                }
            } catch {
                startAutoUpdate();
            }
        } else {
            startAutoUpdate();
        }
    };

    const saveDelayPreference = () => {
        localStorage.setItem(PREFERENCE_DELAY_KEY, delayMinutesInput.value);
    };

    const saveBaseTimePreference = (mode, hour, minute, ampm) => {
        localStorage.setItem(PREFERENCE_BASE_TIME_KEY, JSON.stringify({ mode, hour, minute, ampm }));
    };

    // -----------------------------
    // Selectores hora (modal)
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

    const setBaseTimeFromParts = (hour12, minute, ampm) => {
        let hour = Number(hour12);
        const min = Number(minute);
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        baseTime = new Date();
        baseTime.setHours(hour, min, 0, 0);
    };

    // -----------------------------
    // Cálculos
    // -----------------------------
    const calculateWakeUpTimes = (fallAsleepTime) => {
        return CYCLES.map((cycleData) => {
            const wakeUpTime = new Date(fallAsleepTime.getTime() + cycleData.durationMinutes * 60 * 1000);
            return {
                cycle: cycleData.cycles,
                timeLabel: formatTime(wakeUpTime),
                hour24: wakeUpTime.getHours(),
                minute: wakeUpTime.getMinutes(),
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
              <p class="result-sub">Despertar entre ciclos</p>
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

              <button class="icon-button alarm-button"
                      data-hour24="${result.hour24}" data-minute="${result.minute}"
                      data-label="SleepTimer · ${result.cycle} ciclo${result.cycle > 1 ? 's' : ''}"
                      aria-label="Crear alarma en el reloj">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="13" r="8"></circle>
                  <path d="M5 3 2 6"></path>
                  <path d="m22 6-3-3"></path>
                  <path d="M12 9v5l3 2"></path>
                </svg>
              </button>
            </div>
          </div>
        </div>
      `;

            container.appendChild(card);
        });
    };

    const updateSubtitle = () => {
        const timeLabel = formatTime(baseTime);
        if (currentTimeEl) currentTimeEl.textContent = timeLabel;

        if (timerInterval) {
            subtitleEl.innerHTML = `Hora base: <span class="font-bold text-white">${timeLabel}</span> (actual)`;
        } else {
            subtitleEl.innerHTML = `Hora base: <span class="font-bold text-white">${timeLabel}</span>`;
        }
    };

    const updateGeneralInfo = (delayMinutes) => {
        if (!generalInfoEl) return;
        generalInfoEl.textContent =
            `Cada tarjeta es un ciclo (≈ 90 min). Aquí añadimos ${delayMinutes} min para conciliar el sueño. ` +
            `Elige la hora que mejor se ajuste a tu noche.`;
    };

    const updateApp = () => {
        const delayMinutes = parseInt(delayMinutesInput.value, 10) || 0;

        const fallAsleepTime = new Date(baseTime.getTime() + delayMinutes * 60 * 1000);
        const results = calculateWakeUpTimes(fallAsleepTime);

        renderResults(resultsContainer, results, delayMinutes);
        updateSubtitle();
        updateGeneralInfo(delayMinutes);
    };

    // -----------------------------
    // Auto update
    // -----------------------------
    const startAutoUpdate = () => {
        if (timerInterval) clearInterval(timerInterval);

        baseTime = new Date();
        updateApp();

        timerInterval = setInterval(() => {
            baseTime = new Date();
            updateApp();
        }, 60000);

        // Guarda modo
        const now = new Date();
        let hr = now.getHours();
        const ampm = hr >= 12 ? 'PM' : 'AM';
        hr = hr % 12 || 12;
        saveBaseTimePreference('auto', hr, Math.round(now.getMinutes() / 5) * 5 % 60, ampm);
    };

    const stopAutoUpdate = () => {
        clearInterval(timerInterval);
        timerInterval = null;
    };

    // -----------------------------
    // Handlers
    // -----------------------------
    const handleInfoClick = (cycle) => {
        const cycleData = CYCLES[cycle - 1];
        if (!cycleData) return;
        infoModalTitle.textContent = cycleData.title;
        infoModalText.textContent = cycleData.description;
        openModal(infoModal);
    };

    const handleAlarmClick = (hour24, minute, label) => {
        openAndroidAlarm(hour24, minute, label);
    };

    const copyToClipboard = async (text) => {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                showToast('Hora copiada ✅');
            } else {
                // fallback
                window.prompt('Copia la hora:', text);
            }
        } catch {
            window.prompt('Copia la hora:', text);
        }
    };

    const openTimeModal = () => {
        // precarga la hora actual aproximada a 5 min
        const now = new Date();
        let hours = now.getHours();
        let minutes = Math.round(now.getMinutes() / 5) * 5;
        if (minutes === 60) {
            minutes = 0;
            hours = (hours + 1) % 24;
        }
        const ampm = hours >= 12 ? 'PM' : 'AM';
        let hr12 = hours % 12;
        hr12 = hr12 ? hr12 : 12;

        hourSelect.value = String(hr12);
        minuteSelect.value = String(minutes);
        ampmSelect.value = ampm;

        openModal(timePickerModal);
    };

    const handleConfirmTime = () => {
        const hour12 = parseInt(hourSelect.value, 10);
        const minute = parseInt(minuteSelect.value, 10);
        const ampm = ampmSelect.value;

        setBaseTimeFromParts(hour12, minute, ampm);
        stopAutoUpdate();
        saveBaseTimePreference('manual', hour12, minute, ampm);

        updateApp();
        closeModal(timePickerModal);
        showToast('Hora base actualizada');
    };

    const handleUseCurrentTime = () => {
        startAutoUpdate();
        closeModal(timePickerModal);
        showToast('Usando hora actual');
    };

    // -----------------------------
    // Listeners
    // -----------------------------
    const setupEventListeners = () => {
        openModalBtn.addEventListener('click', openTimeModal);

        timePickerModal.addEventListener('click', (e) => {
            if (e.target === timePickerModal) closeModal(timePickerModal);
        });

        confirmTimeBtn.addEventListener('click', handleConfirmTime);
        useCurrentTimeBtn.addEventListener('click', handleUseCurrentTime);

        delayMinutesInput.addEventListener('input', () => {
            updateApp();
            saveDelayPreference();
        });

        // Delegación de eventos para resultados: info, alarm, copy
        resultsContainer.addEventListener('click', (e) => {
            const infoBtn = e.target.closest('.info-button');
            if (infoBtn) {
                const cycle = parseInt(infoBtn.dataset.cycle, 10);
                handleInfoClick(cycle);
                return;
            }

            const alarmBtn = e.target.closest('.alarm-button');
            if (alarmBtn) {
                const hour24 = parseInt(alarmBtn.dataset.hour24, 10);
                const minute = parseInt(alarmBtn.dataset.minute, 10);
                const label = alarmBtn.dataset.label || 'SleepTimer';
                handleAlarmClick(hour24, minute, label);
                return;
            }

            const copyEl = e.target.closest('[data-copy]');
            if (copyEl) {
                const value = copyEl.getAttribute('data-copy');
                if (value) copyToClipboard(value);
            }
        });

        closeInfoModalBtn.addEventListener('click', () => closeModal(infoModal));
        infoModal.addEventListener('click', (e) => e.target === infoModal && closeModal(infoModal));

        // Esc para cerrar modales
        document.addEventListener('keydown', (e) => {
            if (e.key !== 'Escape') return;
            if (!timePickerModal.classList.contains('hidden')) closeModal(timePickerModal);
            if (!infoModal.classList.contains('hidden')) closeModal(infoModal);
        });

        // Enter dentro del modal confirma
        timePickerModal.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') handleConfirmTime();
        });
    };

    // -----------------------------
    // Init
    // -----------------------------
    const init = () => {
        createStars(110);
        populateTimeSelectors();
        setupEventListeners();
        loadPreferences();
        updateApp();
    };

    init();
});
