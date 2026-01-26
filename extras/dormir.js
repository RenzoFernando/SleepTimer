/* ==========================================================================
   SleepTimer · dormir.js (para /extras/dormir.html)
   Calcula a qué hora dormir restando ciclos al objetivo de despertar.
   ========================================================================== */

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
        closeModal,
        applyCurrentYear,
        setupWakeLockButton,
        openAndroidAlarm,
        handleAlarmFallback
    } = window.SleepTimer || {};

    if (!CYCLES) return;

    const STORAGE = {
        DATE: 'sleepTimer.wakeDate.v3',             // YYYY-MM-DD
        TIME_HOUR: 'sleepTimer.wakeHour.v3',        // 1..12
        TIME_MINUTE: 'sleepTimer.wakeMinute.v3',    // 0..59
        TIME_AMPM: 'sleepTimer.wakeAmPm.v3',        // AM|PM
        DELAY_MINUTES: 'sleepTimer.sleepDelay.v3'   // number
    };

    const els = {
        date: document.getElementById('wake-up-date'),
        hour: document.getElementById('hour-select'),
        minute: document.getElementById('minute-select'),
        ampm: document.getElementById('ampm-select'),
        delay: document.getElementById('delay-minutes-input'),

        createAlarmBtn: document.getElementById('create-alarm-btn'),
        alarmPreview: document.getElementById('alarm-preview'),

        results: document.getElementById('results-container'),

        infoModal: document.getElementById('info-modal'),
        infoModalText: document.getElementById('info-modal-text'),
        closeInfoModalBtn: document.getElementById('close-info-modal-btn')
    };

    document.addEventListener('DOMContentLoaded', () => {
        createStars();
        applyCurrentYear();
        setupWakeLockButton();
        handleAlarmFallback();

        buildSelectors();
        hydrate();
        bindUI();
        updatePreview();
        render();
    });

    /* ====================================================================== */
    /* Selectors                                                               */
    /* ====================================================================== */

    const pad2 = (n) => String(n).padStart(2, '0');

    const buildSelectors = () => {
        // Hora 1..12
        els.hour.innerHTML = '';
        for (let h = 1; h <= 12; h++) {
            const opt = document.createElement('option');
            opt.value = String(h);
            opt.textContent = String(h);
            els.hour.appendChild(opt);
        }

        // Minutos 0..59 en pasos de 5
        els.minute.innerHTML = '';
        for (let m = 0; m < 60; m += 5) {
            const opt = document.createElement('option');
            opt.value = String(m);
            opt.textContent = pad2(m);
            els.minute.appendChild(opt);
        }
    };

    /* ====================================================================== */
    /* Storage / defaults                                                      */
    /* ====================================================================== */

    const todayISO = () => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        const y = d.getFullYear();
        const m = pad2(d.getMonth() + 1);
        const day = pad2(d.getDate());
        return `${y}-${m}-${day}`;
    };

    const tomorrowISO = () => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(0, 0, 0, 0);
        const y = d.getFullYear();
        const m = pad2(d.getMonth() + 1);
        const day = pad2(d.getDate());
        return `${y}-${m}-${day}`;
    };

    const hydrate = () => {
        // Fecha
        const min = todayISO();
        if (els.date) els.date.min = min;

        const savedDate = localStorage.getItem(STORAGE.DATE);
        els.date.value = savedDate || tomorrowISO();

        // Hora
        els.hour.value = localStorage.getItem(STORAGE.TIME_HOUR) || '7';
        els.minute.value = localStorage.getItem(STORAGE.TIME_MINUTE) || '0';
        els.ampm.value = localStorage.getItem(STORAGE.TIME_AMPM) || 'AM';

        // Delay
        const savedDelay = Number(localStorage.getItem(STORAGE.DELAY_MINUTES));
        els.delay.value = Number.isFinite(savedDelay) ? String(clamp(savedDelay, 0, 60)) : '5';
    };

    const persist = () => {
        localStorage.setItem(STORAGE.DATE, els.date.value);
        localStorage.setItem(STORAGE.TIME_HOUR, els.hour.value);
        localStorage.setItem(STORAGE.TIME_MINUTE, els.minute.value);
        localStorage.setItem(STORAGE.TIME_AMPM, els.ampm.value);
        localStorage.setItem(STORAGE.DELAY_MINUTES, String(clamp(Number(els.delay.value), 0, 60)));
    };

    /* ====================================================================== */
    /* UI bindings                                                            */
    /* ====================================================================== */

    const bindUI = () => {
        ['change', 'input'].forEach(evt => {
            els.date.addEventListener(evt, () => { persist(); updatePreview(); render(); });
            els.hour.addEventListener(evt, () => { persist(); updatePreview(); render(); });
            els.minute.addEventListener(evt, () => { persist(); updatePreview(); render(); });
            els.ampm.addEventListener(evt, () => { persist(); updatePreview(); render(); });
            els.delay.addEventListener(evt, () => { persist(); updatePreview(); render(); });
        });

        if (els.createAlarmBtn) {
            els.createAlarmBtn.addEventListener('click', () => {
                const { hour24, minute } = getWakeTimeParts();
                openAndroidAlarm({
                    hour24,
                    minute,
                    label: `SleepTimer ${formatWakeTimeLabel()}`
                });
            });
        }

        if (els.closeInfoModalBtn && els.infoModal) {
            els.closeInfoModalBtn.addEventListener('click', () => closeModal(els.infoModal));
        }

        // Delegación: copiar hora de dormir / abrir info
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
                }
            });
        }
    };

    /* ====================================================================== */
    /* Compute                                                                  */
    /* ====================================================================== */

    const getWakeDateTime = () => {
        const [y, mo, d] = els.date.value.split('-').map(Number);
        const hour12 = Number(els.hour.value);
        const minute = Number(els.minute.value);
        const ampm = els.ampm.value;

        let hour24 = hour12 % 12;
        if (ampm === 'PM') hour24 += 12;

        const dt = new Date(y, (mo - 1), d, hour24, minute, 0, 0);
        return dt;
    };

    const getWakeTimeParts = () => {
        const hour12 = Number(els.hour.value);
        const minute = Number(els.minute.value);
        const ampm = els.ampm.value;

        let hour24 = hour12 % 12;
        if (ampm === 'PM') hour24 += 12;

        return { hour24, minute };
    };

    const formatWakeTimeLabel = () => {
        // Formato tipo 7:00 AM (sin fecha)
        const dt = getWakeDateTime();
        return formatTime(dt);
    };

    const updatePreview = () => {
        if (!els.alarmPreview) return;

        const dt = getWakeDateTime();
        const delay = clamp(Number(els.delay.value), 0, 60);

        const parts = dt.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
        els.alarmPreview.textContent = `Objetivo: ${parts} · ${formatTime(dt)} · delay ${delay} min`;
    };

    /* ====================================================================== */
    /* Rendering                                                               */
    /* ====================================================================== */

    const render = () => {
        const wake = getWakeDateTime();
        const delayMinutes = clamp(Number(els.delay.value), 0, 60);

        // Hora real de inicio de sueño (restando delay) para el cálculo inverso:
        // si te tardas X min en dormir, debes acostarte X min antes.
        // Aquí restamos (ciclo + delay).
        const items = CYCLES.map((cycle) => {
            const bed = new Date(wake.getTime() - (cycle.totalMinutes + delayMinutes) * 60 * 1000);
            return {
                cycle,
                bed,
                bedLabel: formatTime(bed),
                infoText:
                    `${cycle.title} · ${cycle.cycles} ciclo(s)\n` +
                    `Sueño estimado: ${formatHours(cycle.sleepHours)}\n` +
                    `Objetivo de despertar: ${formatTime(wake)}\n` +
                    `Te acuestas: ${formatTime(bed)} (incluye delay ${delayMinutes} min)`
            };
        });

        paintResults(items, delayMinutes);
    };

    const paintResults = (items, delayMinutes) => {
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
              <span class="result-time" data-copy-time="${escapeHtml(item.bedLabel)}" title="Toca para copiar">
                ${escapeHtml(item.bedLabel)}
              </span>
              <div class="badges">${badges.join('')}</div>
            </div>
            <div class="meta-row">
              <span>${escapeHtml(item.cycle.title)}</span>
              <span>·</span>
              <span>Hora para acostarte</span>
            </div>
          </div>

          <div class="card-actions">
            <button class="icon-button" type="button" aria-label="Info" data-info="${escapeHtml(item.infoText)}">
              ${infoIcon()}
            </button>
          </div>
        </div>
      `;

            els.results.appendChild(card);
        });
    };

    /* ====================================================================== */
    /* Helpers                                                                 */
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
})();
