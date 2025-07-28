document.addEventListener('DOMContentLoaded', () => {

    // --- CONSTANTES ---
    const PREFERENCE_KEY = 'sleepTimer-delayMinutes';

    // --- ELEMENTOS DEL DOM ---
    const subtitleEl = document.getElementById('subtitle');
    const resultsContainer = document.getElementById('results-container');
    const delayMinutesInput = document.getElementById('delay-minutes-input');

    // Modal de tiempo
    const timePickerModal = document.getElementById('time-picker-modal');
    const openModalBtn = document.getElementById('open-time-modal-btn');
    const confirmTimeBtn = document.getElementById('confirm-time-btn');
    const useCurrentTimeBtn = document.getElementById('use-current-time-btn');
    const hourSelect = document.getElementById('hour-select');
    const minuteSelect = document.getElementById('minute-select');
    const ampmSelect = document.getElementById('ampm-select');

    // Modal de información
    const infoModal = document.getElementById('info-modal');
    const infoModalTitle = document.getElementById('info-modal-title');
    const infoModalText = document.getElementById('info-modal-text');
    const closeInfoModalBtn = document.getElementById('close-info-modal-btn');

    // --- ESTADO DE LA APLICACIÓN ---
    let timerInterval = null;
    let baseTime = new Date();

    // --- DATOS DE LOS CICLOS ---
    const CYCLE_DETAILS = [
        { text: 'Siesta rápida', glowClass: 'glow-poor', description: 'Un ciclo (1.5h) es ideal para una siesta de poder que mejora el estado de alerta y el rendimiento motor, útil si tienes poco tiempo.' },
        { text: 'Descanso corto', glowClass: 'glow-poor', description: 'Dos ciclos (3h) te ayudarán a sentirte más descansado, mejorando la memoria y la función cognitiva. Es una buena opción para una noche corta.' },
        { text: 'Sueño reparador', glowClass: 'glow-poor', description: 'Tres ciclos (4.5h) completan las fases de sueño más profundas. Es el mínimo recomendado para no interrumpir un ciclo de sueño REM.' },
        { text: 'Descanso aceptable', glowClass: 'glow-acceptable', description: 'Cuatro ciclos (6h) te proporcionan un buen descanso, permitiendo una recuperación física y mental considerable.' },
        { text: 'Buen descanso', glowClass: 'glow-acceptable', description: 'Cinco ciclos (7.5h) se acercan a la cantidad de sueño recomendada para la mayoría de los adultos, resultando en un despertar fresco y con energía.' },
        { text: 'Descanso ideal', glowClass: 'glow-acceptable', description: 'Seis ciclos (9h) es la duración ideal para una recuperación completa. Te despertarás sintiéndote totalmente renovado y en tu máximo potencial.' },
        { text: 'Sueño profundo', glowClass: 'glow-optimal', description: 'Siete ciclos (10.5h) son para aquellos que necesitan una recuperación extra, como atletas o personas con déficit de sueño. Proporciona una restauración máxima.' },
        { text: 'Totalmente recuperado', glowClass: 'glow-optimal', description: 'Ocho ciclos (12h) aseguran que todas las funciones corporales y mentales se restauren por completo. Ideal para un día de descanso total.' },
        { text: 'Máxima energía', glowClass: 'glow-optimal', description: 'Nueve ciclos (13.5h) es más de lo que la mayoría necesita, pero puede ser beneficioso durante períodos de enfermedad o recuperación intensa.' }
    ];

    // --- INICIALIZACIÓN ---
    const init = () => {
        createStars(100);
        loadPreferences();
        populateTimeSelectors();
        setupEventListeners();
        startAutoUpdate();
        updateApp();
    };

    // --- LÓGICA DE PREFERENCIAS ---
    const loadPreferences = () => {
        const savedDelay = localStorage.getItem(PREFERENCE_KEY);
        if (savedDelay !== null) {
            delayMinutesInput.value = savedDelay;
        }
    };

    const savePreferences = () => {
        localStorage.setItem(PREFERENCE_KEY, delayMinutesInput.value);
    };

    // --- LÓGICA DE LA UI ---
    const createStars = (count) => {
        const container = document.getElementById('stars-container');
        if (!container) return;
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

    const populateTimeSelectors = () => {
        for (let i = 1; i <= 12; i++) {
            hourSelect.innerHTML += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }
        for (let i = 0; i < 60; i += 5) {
            minuteSelect.innerHTML += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }
    };

    const renderResults = (container, results) => {
        container.innerHTML = '';
        results.forEach((result, index) => {
            const card = document.createElement('div');
            card.className = `result-card ${result.classification.glowClass}`;
            // Aumento del retraso para una cascada más notable
            card.style.animationDelay = `${index * 80}ms`;
            card.innerHTML = `
                <div class="card-content">
                    <span class="font-bold text-lg text-white">${result.time}</span>
                    <div class="text-right flex-grow">
                        <p class="text-sm font-semibold">${result.classification.text}</p>
                        <p class="text-xs text-gray-400">${result.cycle} ciclo${result.cycle > 1 ? 's' : ''}</p>
                    </div>
                    <button class="info-button" data-cycle-index="${index}" aria-label="Más información">
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                    </button>
                </div>
            `;
            container.appendChild(card);
        });
    };

    // --- LÓGICA DE TIEMPO Y CÁLCULOS ---
    const formatTime = (date) => date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    const calculateWakeUpTimes = (startTime) => {
        return Array.from({ length: 9 }, (_, i) => {
            const cycleNum = i + 1;
            const wakeUpTime = new Date(startTime.getTime() + cycleNum * 90 * 60 * 1000);
            const classification = CYCLE_DETAILS[i];
            return { cycle: cycleNum, time: formatTime(wakeUpTime), classification };
        });
    };

    const updateApp = () => {
        const delayMinutes = parseInt(delayMinutesInput.value, 10) || 0;
        const fallAsleepTime = new Date(baseTime.getTime() + delayMinutes * 60 * 1000);
        const wakeUpResults = calculateWakeUpTimes(fallAsleepTime);
        renderResults(resultsContainer, wakeUpResults);
        updateSubtitle();
    };

    const updateSubtitle = () => {
        if (timerInterval) {
            subtitleEl.innerHTML = `Calculando desde la hora actual: <span class="font-bold text-white">${formatTime(baseTime)}</span>`;
        } else {
            subtitleEl.innerHTML = `Calculando desde las: <span class="font-bold text-white">${formatTime(baseTime)}</span>`;
        }
    };

    // --- MANEJADORES DE EVENTOS ---
    const setupEventListeners = () => {
        openModalBtn.addEventListener('click', () => openModal(timePickerModal));
        timePickerModal.addEventListener('click', (e) => e.target === timePickerModal && closeModal(timePickerModal));
        confirmTimeBtn.addEventListener('click', handleConfirmTime);
        useCurrentTimeBtn.addEventListener('click', handleUseCurrentTime);

        delayMinutesInput.addEventListener('input', () => {
            updateApp();
            savePreferences();
        });

        resultsContainer.addEventListener('click', handleInfoClick);
        closeInfoModalBtn.addEventListener('click', () => closeModal(infoModal));
        infoModal.addEventListener('click', (e) => e.target === infoModal && closeModal(infoModal));
    };

    const handleInfoClick = (e) => {
        const infoButton = e.target.closest('.info-button');
        if (infoButton) {
            const cycleIndex = parseInt(infoButton.dataset.cycleIndex, 10);
            const cycleData = CYCLE_DETAILS[cycleIndex];
            infoModalTitle.textContent = cycleData.text;
            infoModalText.textContent = cycleData.description;
            openModal(infoModal);
        }
    };

    const openModal = (modal) => {
        if (modal === timePickerModal) {
            const now = new Date();
            let hours = now.getHours();
            let minutes = Math.round(now.getMinutes() / 5) * 5;
            if (minutes === 60) {
                minutes = 0;
                hours = (hours + 1) % 24;
            }
            const ampm = hours >= 12 ? 'PM' : 'AM';
            hours = hours % 12;
            hours = hours ? hours : 12;
            hourSelect.value = hours;
            minuteSelect.value = minutes;
            ampmSelect.value = ampm;
        }
        modal.classList.remove('hidden');
    };

    const closeModal = (modal) => modal.classList.add('hidden');

    const handleConfirmTime = () => {
        let hour = parseInt(hourSelect.value, 10);
        const minute = parseInt(minuteSelect.value, 10);
        const ampm = ampmSelect.value;

        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;

        baseTime = new Date();
        baseTime.setHours(hour, minute, 0, 0);

        stopAutoUpdate();
        updateApp();
        closeModal(timePickerModal);
    };

    const handleUseCurrentTime = () => {
        startAutoUpdate();
        updateApp();
        closeModal(timePickerModal);
    };

    // --- TEMPORIZADORES ---
    const startAutoUpdate = () => {
        if (timerInterval) clearInterval(timerInterval);
        baseTime = new Date();
        updateApp();
        timerInterval = setInterval(() => {
            baseTime = new Date();
            updateApp();
        }, 60000);
    };

    const stopAutoUpdate = () => {
        clearInterval(timerInterval);
        timerInterval = null;
    };

    // --- INICIAR LA APP ---
    init();
});
