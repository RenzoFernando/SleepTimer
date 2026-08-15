(() => {
    'use strict';

    const {
        CYCLES,
        formatTime,
        formatHours,
        glowColorForCycle,
        createStars,
        copyToClipboard,
        openModal,
        closeModal
    } = window.SleepTimer || {};

    if (!CYCLES) return;

    const STORAGE = {
        MODE: 'sleepTimer.mode.v4',
        BASE_TIME: 'sleepTimer.baseTime.v3',
        SHARED_DELAY: 'sleepTimer.delayMinutes.v4',
        LEGACY_WAKE_DELAY: 'sleepTimer.delayMinutes.v3',
        LEGACY_SLEEP_DELAY: 'sleepTimer.sleepDelay.v3',
        DATE: 'sleepTimer.wakeDate.v3',
        TIME_HOUR: 'sleepTimer.wakeHour.v3',
        TIME_MINUTE: 'sleepTimer.wakeMinute.v3',
        TIME_AMPM: 'sleepTimer.wakeAmPm.v3'
    };

    const els = {
        wakeModeBtn: document.getElementById('wake-mode-btn'),
        sleepModeBtn: document.getElementById('sleep-mode-btn'),
        wakeControls: document.getElementById('wake-controls'),
        sleepControls: document.getElementById('sleep-controls'),
        currentTime: document.getElementById('current-time'),
        wakeDelay: document.getElementById('wake-delay-minutes-input'),
        sleepDelay: document.getElementById('sleep-delay-minutes-input'),
        results: document.getElementById('results-container'),
        resultsTitle: document.getElementById('results-title'),
        resultsKicker: document.getElementById('results-kicker'),
        howItWorksBtn: document.getElementById('how-it-works-btn'),
        timeModal: document.getElementById('time-picker-modal'),
        openTimeModalBtn: document.getElementById('open-time-modal-btn'),
        useCurrentTimeBtn: document.getElementById('use-current-time-btn'),
        confirmTimeBtn: document.getElementById('confirm-time-btn'),
        baseHour: document.getElementById('base-hour-select'),
        baseMinute: document.getElementById('base-minute-select'),
        baseAmPm: document.getElementById('base-ampm-select'),
        wakeDate: document.getElementById('wake-up-date'),
        wakeHour: document.getElementById('wake-hour-select'),
        wakeMinute: document.getElementById('wake-minute-select'),
        wakeAmPm: document.getElementById('wake-ampm-select'),
        infoModal: document.getElementById('info-modal'),
        infoModalTitle: document.getElementById('info-modal-title'),
        infoModalText: document.getElementById('info-modal-text'),
        closeInfoModalBtn: document.getElementById('close-info-modal-btn')
    };

    let mode = 'wake';
    let baseMode = 'auto';
    let manualBaseParts = null;
    let clockTimer = null;

    document.addEventListener('DOMContentLoaded', () => {
        createStars();
        buildTimeSelectors();
        hydrate();
        bindUI();
        startClock();
        setMode(readInitialMode(), false);
        render();
    });

    const pad2 = (n) => String(n).padStart(2, '0');

    const clamp = (n, min, max) => {
        const value = Number(n);
        if (!Number.isFinite(value)) return min;
        return Math.max(min, Math.min(max, value));
    };

    const escapeHtml = (str) => String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const todayISO = () => {
        const date = new Date();
        const y = date.getFullYear();
        const m = pad2(date.getMonth() + 1);
        const d = pad2(date.getDate());
        return `${y}-${m}-${d}`;
    };

    const tomorrowISO = () => {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const y = date.getFullYear();
        const m = pad2(date.getMonth() + 1);
        const d = pad2(date.getDate());
        return `${y}-${m}-${d}`;
    };

    const buildSelect = (select, values, formatter = String) => {
        if (!select) return;
        select.innerHTML = '';
        values.forEach((value) => {
            const option = document.createElement('option');
            option.value = String(value);
            option.textContent = formatter(value);
            select.appendChild(option);
        });
    };

    const buildTimeSelectors = () => {
        const hours = Array.from({ length: 12 }, (_, index) => index + 1);
        const minutes = Array.from({ length: 12 }, (_, index) => index * 5);

        buildSelect(els.baseHour, hours);
        buildSelect(els.baseMinute, minutes, pad2);
        buildSelect(els.wakeHour, hours);
        buildSelect(els.wakeMinute, minutes, pad2);
    };

    const hydrate = () => {
        hydrateBaseTime();
        hydrateDelay();
        hydrateWakeTarget();
        syncBasePicker();
    };

    const hydrateBaseTime = () => {
        const saved = localStorage.getItem(STORAGE.BASE_TIME);

        if (!saved || saved === 'auto') {
            baseMode = 'auto';
            manualBaseParts = null;
            return;
        }

        if (saved.startsWith('manual:')) {
            const match = saved.match(/^manual:(\d{1,2}):(\d{1,2})$/);
            if (match) {
                baseMode = 'manual';
                manualBaseParts = {
                    hour24: clamp(Number(match[1]), 0, 23),
                    minute: clamp(Number(match[2]), 0, 59)
                };
                return;
            }
        }

        const legacy = new Date(saved);
        if (!Number.isNaN(legacy.getTime())) {
            baseMode = 'manual';
            manualBaseParts = {
                hour24: legacy.getHours(),
                minute: legacy.getMinutes()
            };
            saveManualBase();
            return;
        }

        baseMode = 'auto';
        manualBaseParts = null;
    };

    const hydrateDelay = () => {
        let saved = Number(localStorage.getItem(STORAGE.SHARED_DELAY));

        if (!Number.isFinite(saved)) {
            const legacyWake = Number(localStorage.getItem(STORAGE.LEGACY_WAKE_DELAY));
            const legacySleep = Number(localStorage.getItem(STORAGE.LEGACY_SLEEP_DELAY));
            saved = Number.isFinite(legacyWake) ? legacyWake : (Number.isFinite(legacySleep) ? legacySleep : 5);
        }

        const safe = clamp(saved, 0, 60);
        els.wakeDelay.value = String(safe);
        els.sleepDelay.value = String(safe);
        localStorage.setItem(STORAGE.SHARED_DELAY, String(safe));
    };

    const hydrateWakeTarget = () => {
        const today = todayISO();
        const savedDate = localStorage.getItem(STORAGE.DATE);

        els.wakeDate.min = today;
        els.wakeDate.value = savedDate && savedDate >= today ? savedDate : tomorrowISO();
        els.wakeHour.value = localStorage.getItem(STORAGE.TIME_HOUR) || '7';
        els.wakeMinute.value = localStorage.getItem(STORAGE.TIME_MINUTE) || '0';
        els.wakeAmPm.value = localStorage.getItem(STORAGE.TIME_AMPM) || 'AM';
    };

    const readInitialMode = () => {
        const params = new URLSearchParams(window.location.search);
        const queryMode = params.get('modo');
        if (queryMode === 'dormir') return 'sleep';
        if (queryMode === 'despertar') return 'wake';

        const saved = localStorage.getItem(STORAGE.MODE);
        return saved === 'sleep' ? 'sleep' : 'wake';
    };

    const getBaseTime = () => {
        const now = new Date();
        if (baseMode !== 'manual' || !manualBaseParts) return now;

        const date = new Date(now);
        date.setHours(manualBaseParts.hour24, manualBaseParts.minute, 0, 0);
        return date;
    };

    const saveManualBase = () => {
        if (!manualBaseParts) return;
        localStorage.setItem(
            STORAGE.BASE_TIME,
            `manual:${pad2(manualBaseParts.hour24)}:${pad2(manualBaseParts.minute)}`
        );
    };

    const syncBasePicker = () => {
        const base = getBaseTime();
        let hours = base.getHours();
        const roundedMinutes = Math.round(base.getMinutes() / 5) * 5;
        const safeMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;

        if (roundedMinutes === 60) {
            hours = (hours + 1) % 24;
        }

        const ampm = hours >= 12 ? 'PM' : 'AM';

        els.baseHour.value = String(hours % 12 || 12);
        els.baseMinute.value = String(safeMinutes);
        els.baseAmPm.value = ampm;
    };

    const pickerToParts = () => {
        const hour12 = Number(els.baseHour.value);
        const minute = Number(els.baseMinute.value);
        const ampm = els.baseAmPm.value;

        let hour24 = hour12 % 12;
        if (ampm === 'PM') hour24 += 12;

        return { hour24, minute };
    };

    const getWakeDateTime = () => {
        const [year, month, day] = els.wakeDate.value.split('-').map(Number);
        const hour12 = Number(els.wakeHour.value);
        const minute = Number(els.wakeMinute.value);
        const ampm = els.wakeAmPm.value;

        let hour24 = hour12 % 12;
        if (ampm === 'PM') hour24 += 12;

        return new Date(year, month - 1, day, hour24, minute, 0, 0);
    };

    const persistWakeTarget = () => {
        localStorage.setItem(STORAGE.DATE, els.wakeDate.value);
        localStorage.setItem(STORAGE.TIME_HOUR, els.wakeHour.value);
        localStorage.setItem(STORAGE.TIME_MINUTE, els.wakeMinute.value);
        localStorage.setItem(STORAGE.TIME_AMPM, els.wakeAmPm.value);
    };

    const persistDelay = (value) => {
        const safe = clamp(value, 0, 60);
        els.wakeDelay.value = String(safe);
        els.sleepDelay.value = String(safe);
        localStorage.setItem(STORAGE.SHARED_DELAY, String(safe));
        return safe;
    };

    const setMode = (nextMode, updateUrl = true) => {
        mode = nextMode === 'sleep' ? 'sleep' : 'wake';
        const isWake = mode === 'wake';

        els.wakeModeBtn.classList.toggle('active', isWake);
        els.sleepModeBtn.classList.toggle('active', !isWake);
        els.wakeModeBtn.setAttribute('aria-pressed', isWake ? 'true' : 'false');
        els.sleepModeBtn.setAttribute('aria-pressed', isWake ? 'false' : 'true');
        els.wakeControls.classList.toggle('hidden', !isWake);
        els.sleepControls.classList.toggle('hidden', isWake);

        els.resultsKicker.textContent = isWake ? 'Si te acuestas desde esta hora' : 'Para despertar cuando lo necesitas';
        els.resultsTitle.textContent = isWake ? 'Horas para despertar' : 'Horas para dormir';

        localStorage.setItem(STORAGE.MODE, mode);

        if (updateUrl) {
            const url = new URL(window.location.href);
            if (isWake) {
                url.searchParams.delete('modo');
            } else {
                url.searchParams.set('modo', 'dormir');
            }
            window.history.replaceState({}, document.title, url);
        }

        render();
    };

    const startClock = () => {
        if (clockTimer) window.clearInterval(clockTimer);
        updateBaseLabel();

        clockTimer = window.setInterval(() => {
            if (baseMode === 'auto') {
                updateBaseLabel();
                if (mode === 'wake') render();
            }
        }, 30000);
    };

    const updateBaseLabel = () => {
        els.currentTime.textContent = formatTime(getBaseTime());
    };

    const openGeneralInfo = () => {
        els.infoModalTitle.textContent = 'Cómo funciona';
        els.infoModalText.textContent = mode === 'wake'
            ? 'Cada opción suma ciclos aproximados de 90 minutos desde tu hora base y añade el tiempo que indiques para conciliar el sueño. El semáforo visual pasa de rojo a verde para mostrar, de forma orientativa, duraciones de sueño cada vez más largas.'
            : 'Cada opción resta ciclos aproximados de 90 minutos desde la hora a la que quieres despertar y también descuenta el tiempo que indiques para conciliar el sueño. El semáforo visual pasa de rojo a verde para mostrar, de forma orientativa, duraciones de sueño cada vez más largas.';
        openModal(els.infoModal);
    };

    const openCycleInfo = (text) => {
        els.infoModalTitle.textContent = 'Información del ciclo';
        els.infoModalText.textContent = text;
        openModal(els.infoModal);
    };

    const bindUI = () => {
        els.wakeModeBtn.addEventListener('click', () => setMode('wake'));
        els.sleepModeBtn.addEventListener('click', () => setMode('sleep'));

        els.openTimeModalBtn.addEventListener('click', () => {
            syncBasePicker();
            openModal(els.timeModal);
        });

        els.useCurrentTimeBtn.addEventListener('click', () => {
            baseMode = 'auto';
            manualBaseParts = null;
            localStorage.setItem(STORAGE.BASE_TIME, 'auto');
            closeModal(els.timeModal);
            updateBaseLabel();
            render();
        });

        els.confirmTimeBtn.addEventListener('click', () => {
            baseMode = 'manual';
            manualBaseParts = pickerToParts();
            saveManualBase();
            closeModal(els.timeModal);
            updateBaseLabel();
            render();
        });

        els.wakeDelay.addEventListener('input', () => {
            persistDelay(els.wakeDelay.value);
            render();
        });

        els.sleepDelay.addEventListener('input', () => {
            persistDelay(els.sleepDelay.value);
            render();
        });

        [els.wakeDate, els.wakeHour, els.wakeMinute, els.wakeAmPm].forEach((element) => {
            element.addEventListener('change', () => {
                persistWakeTarget();
                render();
            });
        });

        els.howItWorksBtn.addEventListener('click', openGeneralInfo);
        els.closeInfoModalBtn.addEventListener('click', () => closeModal(els.infoModal));

        els.results.addEventListener('click', async (event) => {
            const timeElement = event.target.closest('[data-copy-time]');
            if (timeElement) {
                await copyToClipboard(timeElement.getAttribute('data-copy-time') || '');
                return;
            }

            const infoButton = event.target.closest('[data-info]');
            if (infoButton) {
                openCycleInfo(infoButton.getAttribute('data-info') || '');
            }
        });
    };

    const render = () => {
        updateBaseLabel();
        if (mode === 'wake') {
            renderWakeResults();
        } else {
            renderSleepResults();
        }
    };

    const renderWakeResults = () => {
        const base = getBaseTime();
        const delayMinutes = persistDelay(els.wakeDelay.value);
        const sleepStart = new Date(base.getTime() + delayMinutes * 60 * 1000);

        const items = CYCLES.map((cycle) => {
            const wake = new Date(sleepStart.getTime() + cycle.totalMinutes * 60 * 1000);
            return {
                cycle,
                label: formatTime(wake),
                meta: 'Hora para despertar',
                infoText:
                    `${cycle.title} · ${cycle.cycles} ciclo(s)\n` +
                    `Sueño estimado: ${formatHours(cycle.sleepHours)}\n` +
                    `Hora base: ${formatTime(base)}\n` +
                    `Tiempo para dormir: ${delayMinutes} min\n` +
                    `Despiertas: ${formatTime(wake)}`
            };
        });

        paintResults(items, delayMinutes);
    };

    const renderSleepResults = () => {
        persistWakeTarget();
        const wake = getWakeDateTime();
        const delayMinutes = persistDelay(els.sleepDelay.value);

        const items = CYCLES.map((cycle) => {
            const bed = new Date(wake.getTime() - (cycle.totalMinutes + delayMinutes) * 60 * 1000);
            return {
                cycle,
                label: formatTime(bed),
                meta: 'Hora para acostarte',
                infoText:
                    `${cycle.title} · ${cycle.cycles} ciclo(s)\n` +
                    `Sueño estimado: ${formatHours(cycle.sleepHours)}\n` +
                    `Objetivo de despertar: ${formatTime(wake)}\n` +
                    `Tiempo para dormir: ${delayMinutes} min\n` +
                    `Te acuestas: ${formatTime(bed)}`
            };
        });

        paintResults(items, delayMinutes);
    };

    const paintResults = (items, delayMinutes) => {
        els.results.innerHTML = '';

        items.forEach((item) => {
            const color = glowColorForCycle(item.cycle.cycles);
            const card = document.createElement('article');
            card.className = 'result-card';
            card.style.setProperty('--glow-color', color);

            const badges = [
                `<span class="badge">${formatHours(item.cycle.sleepHours)}</span>`,
                `<span class="badge">${item.cycle.cycles} ciclo(s)</span>`
            ];

            const recommendedBadge = item.cycle.recommended
                ? '<span class="badge recommended">Recomendado</span>'
                : '';

            card.innerHTML = `
                <div class="card-content">
                    <div class="card-main">
                        <div class="time-row">
                            <span class="result-time" data-copy-time="${escapeHtml(item.label)}" title="Toca para copiar">${escapeHtml(item.label)}</span>
                            <div class="badges">${badges.join('')}</div>
                        </div>
                        <div class="meta-row">
                            ${recommendedBadge}
                            <span class="meta-copy">
                                <span>${escapeHtml(item.cycle.title)}</span>
                                <span>·</span>
                                <span>${escapeHtml(item.meta)}</span>
                            </span>
                        </div>
                    </div>

                    <div class="card-actions">
                        <button class="icon-button" type="button" aria-label="Información del ciclo" data-info="${escapeHtml(item.infoText)}">
                            ${infoIcon()}
                        </button>
                    </div>
                </div>
            `;

            els.results.appendChild(card);
        });
    };

    const infoIcon = () => `
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" stroke-width="1.6"/>
            <path d="M12 10.7v6.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
            <path d="M12 7.6h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
        </svg>
    `;
})();


