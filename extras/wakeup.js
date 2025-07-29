document.addEventListener('DOMContentLoaded', () => {
    // --- CONSTANTES ---
    const TIME_PREFERENCE_KEY = 'sleepTimer-wakeUpTime';
    const DELAY_PREFERENCE_KEY = 'sleepTimer-wakeUpDelay';

    // --- ELEMENTOS DEL DOM ---
    const dateInput = document.getElementById('wake-up-date');
    const hourSelect = document.getElementById('hour-select');
    const minuteSelect = document.getElementById('minute-select');
    const ampmSelect = document.getElementById('ampm-select');
    const delayMinutesInput = document.getElementById('delay-minutes-input');
    const resultsContainer = document.getElementById('results-container');

    // --- DATOS DE LOS CICLOS (9 CICLOS) ---
    const CYCLE_DETAILS = [
        { text: '1 ciclo de sueño', glowClass: 'glow-poor', duration: 1.5 },
        { text: '2 ciclos de sueño', glowClass: 'glow-poor', duration: 3 },
        { text: '3 ciclos de sueño', glowClass: 'glow-poor', duration: 4.5 },
        { text: '4 ciclos de sueño', glowClass: 'glow-acceptable', duration: 6 },
        { text: '5 ciclos de sueño', glowClass: 'glow-acceptable', duration: 7.5 },
        { text: '6 ciclos de sueño', glowClass: 'glow-acceptable', duration: 9 },
        { text: '7 ciclos de sueño', glowClass: 'glow-optimal', duration: 10.5 },
        { text: '8 ciclos de sueño', glowClass: 'glow-optimal', duration: 12 },
        { text: '9 ciclos de sueño', glowClass: 'glow-optimal', duration: 13.5 },
    ];

    // --- INICIALIZACIÓN ---
    const init = () => {
        createStars(100);
        populateTimeSelectors();
        setDefaultDateTime();
        loadPreferences();
        setupEventListeners();
        updateApp();
    };

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

    const loadPreferences = () => {
        const savedTime = localStorage.getItem(TIME_PREFERENCE_KEY);
        if (savedTime) {
            const { hour, minute, ampm } = JSON.parse(savedTime);
            hourSelect.value = hour;
            minuteSelect.value = minute;
            ampmSelect.value = ampm;
        }
        const savedDelay = localStorage.getItem(DELAY_PREFERENCE_KEY);
        if (savedDelay !== null) {
            delayMinutesInput.value = savedDelay;
        }
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

    const populateTimeSelectors = () => {
        for (let i = 1; i <= 12; i++) {
            hourSelect.innerHTML += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }
        for (let i = 0; i < 60; i += 5) {
            minuteSelect.innerHTML += `<option value="${i}">${String(i).padStart(2, '0')}</option>`;
        }
    };

    const setDefaultDateTime = () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yyyy = tomorrow.getFullYear();
        const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
        const dd = String(tomorrow.getDate()).padStart(2, '0');
        dateInput.value = `${yyyy}-${mm}-${dd}`;

        hourSelect.value = '7';
        minuteSelect.value = '0';
        ampmSelect.value = 'AM';
    };

    const renderResults = (container, results) => {
        container.innerHTML = '';
        results.forEach((result, index) => {
            const card = document.createElement('div');
            card.className = `result-card ${result.classification.glowClass}`;
            card.style.animationDelay = `${index * 80}ms`;
            card.innerHTML = `
                <div class="card-content">
                    <span class="font-bold text-lg text-white">${result.time}</span>
                    <div class="text-right flex-grow">
                        <p class="text-sm font-semibold">${result.classification.text}</p>
                        <p class="text-xs text-gray-400">Para dormir ${result.duration}h</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    };

    const formatTime = (date) => date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: true });

    const calculateBedTimes = (wakeUpTime, delayMinutes) => {
        return Array.from({ length: 9 }, (_, i) => {
            const cycleNum = i + 1;
            const bedTime = new Date(wakeUpTime.getTime() - (cycleNum * 90 * 60 * 1000) - (delayMinutes * 60 * 1000));
            return {
                time: formatTime(bedTime),
                classification: CYCLE_DETAILS[i],
                duration: CYCLE_DETAILS[i].duration
            };
        });
    };

    const updateApp = () => {
        const dateParts = dateInput.value.split('-');
        let hour = parseInt(hourSelect.value, 10);
        const minute = parseInt(minuteSelect.value, 10);
        const ampm = ampmSelect.value;
        if (ampm === 'PM' && hour < 12) hour += 12;
        if (ampm === 'AM' && hour === 12) hour = 0;
        const wakeUpDateTime = new Date(dateParts[0], dateParts[1] - 1, dateParts[2], hour, minute);

        const delayMinutes = parseInt(delayMinutesInput.value, 10) || 0;
        const bedTimeResults = calculateBedTimes(wakeUpDateTime, delayMinutes);
        renderResults(resultsContainer, bedTimeResults);
    };

    const setupEventListeners = () => {
        [dateInput, hourSelect, minuteSelect, ampmSelect, delayMinutesInput].forEach(el => {
            el.addEventListener('change', () => {
                updateApp();
                savePreferences();
            });
        });
    };

    init();
});
