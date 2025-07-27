document.addEventListener('DOMContentLoaded', () => {

    // --- ELEMENTOS DEL DOM ---
    const subtitleEl = document.getElementById('subtitle');
    const resultsNowContainer = document.getElementById('results-now');
    const resultsLaterContainer = document.getElementById('results-later');
    const delayMinutesInput = document.getElementById('delay-minutes-input');

    // Modal
    const modal = document.getElementById('time-picker-modal');
    const openModalBtn = document.getElementById('open-time-modal-btn');
    const confirmTimeBtn = document.getElementById('confirm-time-btn');
    const useCurrentTimeBtn = document.getElementById('use-current-time-btn');
    const hourSelect = document.getElementById('hour-select');
    const minuteSelect = document.getElementById('minute-select');
    const ampmSelect = document.getElementById('ampm-select');

    // --- ESTADO DE LA APLICACIÓN ---
    let timerInterval = null;
    let baseTime = new Date();

    // --- CLASIFICACIONES MEJORADAS Y DESCRIPTIVAS ---
    const CYCLE_DETAILS = [
        { text: 'Siesta de poder', glowClass: 'glow-poor' },      // Ciclo 1
        { text: 'Sueño ligero', glowClass: 'glow-poor' },         // Ciclo 2
        { text: 'Mínimo para funcionar', glowClass: 'glow-poor' },// Ciclo 3
        { text: 'Descanso aceptable', glowClass: 'glow-acceptable' },// Ciclo 4
        { text: 'Buen descanso', glowClass: 'glow-acceptable' },  // Ciclo 5
        { text: 'Descanso ideal', glowClass: 'glow-acceptable' },    // Ciclo 6
        { text: 'Sueño profundo', glowClass: 'glow-optimal' },    // Ciclo 7
        { text: 'Totalmente recuperado', glowClass: 'glow-optimal' },// Ciclo 8
        { text: 'Máxima energía', glowClass: 'glow-optimal' }     // Ciclo 9
    ];

    // --- INICIALIZACIÓN ---

    /**
     * Función principal que se ejecuta al cargar la página.
     */
    const init = () => {
        createStars(100);
        populateTimeSelectors();
        setupEventListeners();
        startAutoUpdate();
        updateApp();
    };

    // --- LÓGICA DE LA UI ---

    /**
     * Crea estrellas animadas en el fondo.
     * @param {number} count - Número de estrellas a crear.
     */
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

    /**
     * Rellena los selectores de hora, minuto y AM/PM en el modal.
     */
    const populateTimeSelectors = () => {
        for (let i = 1; i <= 12; i++) {
            hourSelect.innerHTML += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }
        for (let i = 0; i < 60; i++) {
            minuteSelect.innerHTML += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }
    };

    /**
     * Renderiza las tarjetas de resultados.
     * @param {HTMLElement} container - El contenedor para las tarjetas.
     * @param {Array<Object>} results - Los datos de los resultados.
     */
    const renderResults = (container, results) => {
        container.innerHTML = '';
        results.forEach((result) => {
            const card = document.createElement('div');
            card.className = `result-card ${result.classification.glowClass}`;
            card.innerHTML = `
                <div class="card-content">
                    <span class="font-bold text-lg text-white">${result.time}</span>
                    <div class="text-right">
                        <p class="text-sm font-semibold">${result.classification.text}</p>
                        <p class="text-xs text-gray-400">${result.cycle} ciclo${result.cycle > 1 ? 's' : ''}</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    };

    // --- LÓGICA DE TIEMPO Y CÁLCULOS ---

    /**
     * Formatea un objeto Date a HH:MM AM/PM.
     * @param {Date} date - La fecha a formatear.
     * @returns {string}
     */
    const formatTime = (date) => date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    /**
     * Calcula los ciclos de sueño usando los nuevos títulos descriptivos.
     * @param {Date} startTime - La hora de inicio.
     * @returns {Array<Object>}
     */
    const calculateWakeUpTimes = (startTime) => {
        return Array.from({ length: 9 }, (_, i) => {
            const cycleNum = i + 1;
            const wakeUpTime = new Date(startTime.getTime() + cycleNum * 90 * 60 * 1000);
            // Asigna la clasificación directamente desde el array CYCLE_DETAILS
            const classification = CYCLE_DETAILS[i];
            return { cycle: cycleNum, time: formatTime(wakeUpTime), classification };
        });
    };

    /**
     * Función principal que actualiza toda la aplicación.
     */
    const updateApp = () => {
        const resultsNow = calculateWakeUpTimes(baseTime);
        renderResults(resultsNowContainer, resultsNow);

        const delayMinutes = parseInt(delayMinutesInput.value, 10) || 5;
        const timeLater = new Date(baseTime.getTime() + delayMinutes * 60 * 1000);
        const resultsLater = calculateWakeUpTimes(timeLater);
        renderResults(resultsLaterContainer, resultsLater);

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
        openModalBtn.addEventListener('click', openModal);
        modal.addEventListener('click', (e) => e.target === modal && closeModal());
        confirmTimeBtn.addEventListener('click', handleConfirmTime);
        useCurrentTimeBtn.addEventListener('click', handleUseCurrentTime);
        delayMinutesInput.addEventListener('input', updateApp);
    };

    const openModal = () => {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours ? hours : 12; // el 0 se convierte en 12

        hourSelect.value = hours;
        minuteSelect.value = minutes;
        ampmSelect.value = ampm;

        modal.classList.remove('hidden');
    };

    const closeModal = () => modal.classList.add('hidden');

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
        closeModal();
    };

    const handleUseCurrentTime = () => {
        startAutoUpdate();
        updateApp();
        closeModal();
    };

    // --- TEMPORIZADORES ---

    const startAutoUpdate = () => {
        if (timerInterval) clearInterval(timerInterval);
        baseTime = new Date();
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
