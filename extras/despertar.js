/* ==========================================================================
   SleepTimer · despertar.js (para index.html)
   Calcula mejores horas para despertar a partir de una hora base + delay.
   ========================================================================== */

(() => {
    'use strict';

    const {
        CYCLES,
        formatTime,
        formatHours,
        glowColorForCycle,
        createStars,
        showToast,
        copyToClipboard,
        openModal,
        closeModal,
        applyCurrentYear,
        setupWakeLockButton,
        openAndroidAlarm,
        handleAlarmFallback
    } = window.SleepTimer || {};

    // Si common.js no cargó, evita romper todo.
    if (!CYCLES) return;

    const STORAGE = {
        BASE_TIME: 'sleepTimer.baseTime.v3',        // ISO string o 'auto'
        DELAY_MINUTES: 'sleepTimer.delayMinutes.v3' // number
    };

    const els = {
        currentTime: document.getElementById('current-time'),
        subtitle: document.getElementById('subtitle'),
        delayInput: document.getElementById('delay-minutes-input'),
        results: document.getElementById('results-container'),

        timeModal: document.getElementById('time-picker-modal'),
        openTimeModalBtn: document.getElementById('open-time-modal-btn'),
        useCurrentTimeBtn: document.getElementById('use-current-time-btn'),
        confirmTimeBtn: document.getElementById('confirm-time-btn'),

        hourSelect: document.getElementById('hour-select'),
        minuteSelect: document.getElementById('minute-select'),
        ampmSelect: document.getElementById('ampm-select'),

        infoModal: document.getElementById('info-modal'),
        infoModalText: document.getElementById('info-modal-text'),
        closeInfoModalBtn: document.getElementById('close-info-modal-btn')
    };

    // Estado
    let baseMode = 'auto'; // 'auto' o 'manual'
    let manualBaseTime = null; // Date
    let clockTimer = null;

    /* ====================================================================== */
    /* Init                                                                    */
    /* ====================================================================== */

    document.addEventListener('DOMContentLoaded', () => {
        createStars();
        applyCurrentYear();
        setupWakeLockButton();
        handleAlarmFallback(); // si el intent no se pudo resolver

        hydrateDelay();
        hydrateBaseTime();
        buildTimePickerOptions();

        bindUI();
        startClock();
        render();
    });

    /* ====================================================================== */
    /* Storage                                                                 */
    /* ====================================================================== */

    const hydrateDelay = () => {
        const saved = Number(localStorage.getItem(STORAGE.DELAY_MINUTES));
        if (Number.isFinite(saved)) {
            els.delayInput.value = String(Math.max(0, Math.min(60, saved)));
        } else {
            els.delayInput.value = '5';
        }
    };

    const saveDelay = () => {
        const v = Number(els.delayInput.value);
        const safe = Number.isFinite(v) ? Math.max(0, Math.min(60, v)) : 5;
        localStorage.setItem(STORAGE.DELAY_MINUTES, String(safe));
    };

    const hydrateBaseTime = () => {
        const saved = localStorage.getItem(STORAGE.BASE_TIME);
        if (!saved || saved === 'auto') {
            baseMode = 'auto';
            manualBaseTime = null;
            return;
        }

        const d = new Date(saved);
        if (isNaN(d.getTime())) {
            baseMode = 'auto';
            manualBaseTime = null;
            return;
        }

        baseMode = 'manual';
        manualBaseTime = d;
    };

    const saveBaseTimeAuto = () => localStorage.setItem(STORAGE.BASE_TIME, 'auto');

    const saveBaseTimeManual = (date) => localStorage.setItem(STORAGE.BASE_TIME, date.toISOString());

    /* ====================================================================== */
    /* Clock & Base time                                                      */
    /* ====================================================================== */

    const getBaseTime = () => {
        if (baseMode === 'manual' && manualBaseTime) return new Date(manualBaseTime);
        return new Date(); // auto
    };

    const startClock = () => {
        stopClock();
        updateCurrentTimeLabel();

        // Solo actualiza si estamos en modo auto
        clockTimer = window.setInterval(() => {
            if (baseMode === 'auto') updateCurrentTimeLabel();
        }, 1000);
    };

    const stopClock = () => {
        if (clockTimer) window.clearInterval(clockTimer);
        clockTimer = null;
    };

    const updateCurrentTimeLabel = () => {
        const base = getBaseTime();
        if (els.currentTime) els.currentTime.textContent = formatTime(base);
    };

    /* ====================================================================== */
    /* Time picker                                                            */
    /* ====================================================================== */

    const buildTimePickerOptions = () => {
        if (!els.hourSelect || !els.minuteSelect) return;

        // Hours 1..12
        els.hourSelect.innerHTML = '';
        for (let h = 1; h <= 12; h++) {
            const opt = document.createElement('option');
            opt.value = String(h);
            opt.textContent = String(h);
            els.hourSelect.appendChild(opt);
        }

        // Minutes in steps of 5
        els.minuteSelect.innerHTML = '';
        for (let m = 0; m < 60; m += 5) {
            const opt = document.createElement('option');
            opt.value = String(m);
            opt.textContent = pad2(m);
            els.minuteSelect.appendChild(opt);
        }

        // Default values based on current base time
        syncPickerFromBase();
    };

    const pad2 = (n) => String(n).padStart(2, '0');

    const syncPickerFromBase = () => {
        const base = getBaseTime();

        let hours = base.getHours(); // 0..23
        const minutes = base.getMinutes();

        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;

        // Redondea a múltiplos de 5
        const roundedMinutes = Math.round(minutes / 5) * 5;
        const safeMinutes = (roundedMinutes + 60) % 60;

        els.hourSelect.value = String(hours);
        els.minuteSelect.value = String(safeMinutes);
        els.ampmSelect.value = ampm;
    };

    const pickerToDate = () => {
        const base = getBaseTime(); // toma fecha actual para no perder día
        const hour12 = Number(els.hourSelect.value);
        const minute = Number(els.minuteSelect.value);
        const ampm = els.ampmSelect.value;

        let hour24 = hour12 % 12;
        if (ampm === 'PM') hour24 += 12;

        const d = new Date(base);
        d.setHours(hour24, minute, 0, 0);
        return d;
    };

    /* ====================================================================== */
    /* UI bindings                                                            */
    /* ====================================================================== */

    const bindUI = () => {
        if (els.delayInput) {
            els.delayInput.addEventListener('input', () => {
                saveDelay();
                render();
            });
        }

        if (els.openTimeModalBtn && els.timeModal) {
            els.openTimeModalBtn.addEventListener('click', () => {
                syncPickerFromBase();
                openModal(els.timeModal);
            });
        }

        if (els.useCurrentTimeBtn && els.timeModal) {
            els.useCurrentTimeBtn.addEventListener('click', () => {
                baseMode = 'auto';
                manualBaseTime = null;
                saveBaseTimeAuto();
                closeModal(els.timeModal);
                updateCurrentTimeLabel();
                render();
            });
        }

        if (els.confirmTimeBtn && els.timeModal) {
            els.confirmTimeBtn.addEventListener('click', () => {
                baseMode = 'manual';
                manualBaseTime = pickerToDate();
                saveBaseTimeManual(manualBaseTime);
                closeModal(els.timeModal);
                updateCurrentTimeLabel();
                render();
            });
        }

        if (els.closeInfoModalBtn && els.infoModal) {
            els.closeInfoModalBtn.addEventListener('click', () => closeModal(els.infoModal));
        }

        // Delegación: copiar hora / abrir info / crear alarma
        if (els.results) {
            els.results.addEventListener('click', async (ev) => {
                const timeEl = ev.target.closest('[data-copy-time]');
                if (timeEl) {
                    await copyToClipboard(timeEl.getAttribute('data-copy-time') || '');
                    return;
                }

                const infoBtn = ev.target.closest('[data-info]');
                if (infoBtn) {
                    const text = infoBtn.getAttribute('data-info') || '';
                    if (els.infoModalText) els.infoModalText.textContent = text;
                    openModal(els.infoModal);
                    return;
                }

                const alarmBtn = ev.target.closest('[data-alarm-hour]');
                if (alarmBtn) {
                    const h = Number(alarmBtn.getAttribute('data-alarm-hour'));
                    const m = Number(alarmBtn.getAttribute('data-alarm-minute'));
                    const label = alarmBtn.getAttribute('data-alarm-label') || 'SleepTimer';
                    openAndroidAlarm({ hour24: h, minute: m, label });
                }
            });
        }
    };

    /* ====================================================================== */
    /* Rendering                                                               */
    /* ====================================================================== */

    const render = () => {
        updateCurrentTimeLabel();

        const base = getBaseTime();
        const delayMinutes = clamp(Number(els.delayInput.value), 0, 60);
        const sleepStart = new Date(base.getTime() + delayMinutes * 60 * 1000);

        // Construye resultados
        const results = CYCLES.map((cycle) => {
            const wake = new Date(sleepStart.getTime() + cycle.totalMinutes * 60 * 1000);
            return {
                cycle,
                wake,
                wakeLabel: formatTime(wake),
                hour24: wake.getHours(),
                minute: wake.getMinutes(),
                infoText:
                    `${cycle.title} · ${cycle.cycles} ciclo(s)\n` +
                    `Sueño estimado: ${formatHours(cycle.sleepHours)}\n` +
                    `Te duermes: ${formatTime(sleepStart)} (delay ${delayMinutes} min)\n` +
                    `Despiertas: ${formatTime(wake)}`
            };
        });

        paintResults(results, delayMinutes, sleepStart);
    };

    const paintResults = (items, delayMinutes, sleepStart) => {
        if (!els.results) return;

        els.results.innerHTML = '';

        items.forEach((item, idx) => {
            const glow = glowColorForCycle(item.cycle.cycles);

            const card = document.createElement('div');
            card.className = 'result-card';
            card.style.setProperty('--glow-color', glow);
            card.style.animationDelay = `${idx * 55}ms`;

            const badges = [];
            badges.push(`<span class="badge">${formatHours(item.cycle.sleepHours)}</span>`);
            badges.push(`<span class="badge">${item.cycle.cycles} ciclo(s)</span>`);
            badges.push(`<span class="badge">+${delayMinutes} min</span>`);
            if (item.cycle.recommended) badges.push(`<span class="badge recommended">Recomendado</span>`);

            card.innerHTML = `
        <div class="card-content">
          <div class="card-main">
            <div class="time-row">
              <span class="result-time" data-copy-time="${escapeHtml(item.wakeLabel)}" title="Toca para copiar">
                ${escapeHtml(item.wakeLabel)}
              </span>
              <div class="badges">${badges.join('')}</div>
            </div>
            <div class="meta-row">
              <span>${escapeHtml(item.cycle.title)}</span>
              <span>·</span>
              <span>Despertar entre ciclos</span>
            </div>
          </div>

          <div class="card-actions">
            <button class="icon-button" type="button" aria-label="Info" data-info="${escapeHtml(item.infoText)}">
              ${infoIcon()}
            </button>

            <button
              class="icon-button"
              type="button"
              aria-label="Crear alarma"
              data-alarm-hour="${item.hour24}"
              data-alarm-minute="${item.minute}"
              data-alarm-label="SleepTimer ${escapeHtml(item.wakeLabel)}"
              title="Crear alarma"
            >
              ${alarmIcon()}
            </button>
          </div>
        </div>
      `;

            els.results.appendChild(card);
        });
    };

    /* ====================================================================== */
    /* Icons + helpers                                                        */
    /* ====================================================================== */

    const clamp = (n, a, b) => Math.max(a, Math.min(b, Number.isFinite(n) ? n : a));

    const escapeHtml = (str) => String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const infoIcon = () => `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 10.7v6.1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
      <path d="M12 7.6h.01" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    </svg>
  `;

    const alarmIcon = () => `
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 22c4.418 0 8-3.582 8-8s-3.582-8-8-8-8 3.582-8 8 3.582 8 8 8Z" stroke="currentColor" stroke-width="1.6"/>
      <path d="M12 10v4l2.6 1.6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M4.5 6.3 2.7 4.5M19.5 6.3l1.8-1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>
    </svg>
  `;
})();
