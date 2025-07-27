// Esperar a que todo el contenido del HTML esté cargado antes de ejecutar el script.
document.addEventListener('DOMContentLoaded', () => {

    // --- REFERENCIAS A ELEMENTOS DEL DOM ---
    const currentTimeEl = document.getElementById('current-time');
    const subtitleEl = document.getElementById('subtitle');
    const resultsNowContainer = document.getElementById('results-now');
    const resultsLaterContainer = document.getElementById('results-later');
    const toggleCustomTimeBtn = document.getElementById('toggle-custom-time');
    const customTimeInput = document.getElementById('custom-time-input');
    const delayMinutesInput = document.getElementById('delay-minutes-input');

    // --- ESTADO DE LA APLICACIÓN ---
    let timerInterval = null;
    let useCustomTime = false;

    // --- CLASIFICACIONES DE CICLOS ---
    const CYCLE_CLASSIFICATIONS = {
        POOR: { text: 'Poco sueño', colorClass: 'border-poor' },
        ACCEPTABLE: { text: 'Descanso medio', colorClass: 'border-acceptable' },
        OPTIMAL: { text: 'Sueño óptimo', colorClass: 'border-optimal' }
    };

    // --- FUNCIONES DE LÓGICA ---

    /**
     * Formatea un objeto Date a un string HH:MM AM/PM en español.
     * @param {Date} date - El objeto Date a formatear.
     * @returns {string} - La hora formateada.
     */
    const formatTime = (date) => {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    /**
     * Calcula 9 ciclos de sueño de 90 minutos desde una hora de inicio.
     * @param {Date} startTime - La hora desde la que se inician los cálculos.
     * @returns {Array<Object>} - Un array de objetos con la hora de despertar y su clasificación.
     */
    const calculateWakeUpTimes = (startTime) => {
        const results = [];
        for (let i = 1; i <= 9; i++) {
            const wakeUpTime = new Date(startTime.getTime() + i * 90 * 60 * 1000);
            let classification;
            if (i <= 3) {
                classification = CYCLE_CLASSIFICATIONS.POOR;
            } else if (i <= 6) {
                classification = CYCLE_CLASSIFICATIONS.ACCEPTABLE;
            } else {
                classification = CYCLE_CLASSIFICATIONS.OPTIMAL;
            }
            results.push({
                cycle: i,
                time: formatTime(wakeUpTime),
                classification: classification
            });
        }
        return results;
    };

    /**
     * Renderiza las tarjetas de resultados en el contenedor especificado.
     * @param {HTMLElement} container - El elemento del DOM donde se insertarán las tarjetas.
     * @param {Array<Object>} results - El array de resultados a mostrar.
     */
    const renderResults = (container, results) => {
        container.innerHTML = ''; // Limpiar resultados anteriores para evitar duplicados
        results.forEach((result, index) => {
            const card = document.createElement('div');
            card.className = `result-card ${result.classification.colorClass}`;
            card.style.animationDelay = `${index * 80}ms`; // Efecto de cascada

            card.innerHTML = `
                <div class="flex justify-between items-center">
                    <div class="font-bold text-white">
                        <span class="text-xl">${result.time}</span>
                    </div>
                    <div class="text-right">
                        <p class="text-sm font-semibold text-white">${result.classification.text}</p>
                        <p class="text-xs text-gray-400">${result.cycle} ciclo${result.cycle > 1 ? 's' : ''} de sueño</p>
                    </div>
                </div>
            `;
            container.appendChild(card);
        });
    };

    /**
     * Función principal que actualiza toda la UI.
     */
    const updateApp = () => {
        let baseTime;

        if (useCustomTime && customTimeInput.value) {
            const [hours, minutes] = customTimeInput.value.split(':');
            baseTime = new Date();
            baseTime.setHours(hours, minutes, 0, 0);
            subtitleEl.innerHTML = `Calculando desde la hora personalizada: <span class="font-bold text-white">${formatTime(baseTime)}</span>`;
        } else {
            baseTime = new Date();
            const formattedCurrentTime = formatTime(baseTime);
            subtitleEl.innerHTML = `Calculando desde la hora actual: <span class="font-bold text-white">${formattedCurrentTime}</span>`;
        }

        // Calcular y renderizar para "ahora"
        const resultsNow = calculateWakeUpTimes(baseTime);
        renderResults(resultsNowContainer, resultsNow);

        // Obtener el tiempo de demora del input y calcular la segunda columna
        const timeToFallAsleep = parseInt(delayMinutesInput.value, 10) || 5;
        const timeLater = new Date(baseTime.getTime() + timeToFallAsleep * 60 * 1000);
        const resultsLater = calculateWakeUpTimes(timeLater);
        renderResults(resultsLaterContainer, resultsLater);
    };

    // --- MANEJADORES DE EVENTOS ---

    toggleCustomTimeBtn.addEventListener('click', () => {
        customTimeInput.classList.toggle('hidden');
        if (customTimeInput.classList.contains('hidden')) {
            useCustomTime = false;
            toggleCustomTimeBtn.textContent = "Usar otra hora de inicio";
            startAutoUpdate();
            updateApp();
        } else {
            useCustomTime = true;
            toggleCustomTimeBtn.textContent = "Usar la hora actual";
            stopAutoUpdate();
            customTimeInput.focus();
        }
    });

    customTimeInput.addEventListener('change', () => {
        if (useCustomTime) {
            updateApp();
        }
    });

    // Añadir listener para el nuevo input de minutos de demora
    delayMinutesInput.addEventListener('input', updateApp);


    // --- INICIALIZACIÓN Y TEMPORIZADORES ---

    const startAutoUpdate = () => {
        if (timerInterval) clearInterval(timerInterval);
        timerInterval = setInterval(updateApp, 60000); // Actualiza cada 60 segundos
    };

    const stopAutoUpdate = () => {
        clearInterval(timerInterval);
        timerInterval = null;
    };

    // Ejecución inicial al cargar la página
    updateApp();
    startAutoUpdate();
});
