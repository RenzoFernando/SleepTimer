/* ==========================================================================
   SleepTimer · common.js
   - Utilidades compartidas (toasts, estrellas, formato de hora, intent de alarma)
   ========================================================================== */

(() => {
    'use strict';

    /** Ciclos (90 min por ciclo). Mantengo tu lógica/estructura original. */
    const CYCLES = [
        { cycles: 1, sleepHours: 1.5, totalMinutes: 90,  title: 'Muy corto' },
        { cycles: 2, sleepHours: 3.0, totalMinutes: 180, title: 'Corto' },
        { cycles: 3, sleepHours: 4.5, totalMinutes: 270, title: 'Regular' },
        { cycles: 4, sleepHours: 6.0, totalMinutes: 360, title: 'Bueno' },
        { cycles: 5, sleepHours: 7.5, totalMinutes: 450, title: 'Excelente' },
        { cycles: 6, sleepHours: 9.0, totalMinutes: 540, title: 'Sueño completo' },
        { cycles: 7, sleepHours: 10.5, totalMinutes: 630, title: 'Extra largo' },
        { cycles: 8, sleepHours: 12.0, totalMinutes: 720, title: 'Muy largo' },
        { cycles: 9, sleepHours: 13.5, totalMinutes: 810, title: 'Extremo' }
    ].map(c => ({
        ...c,
        recommended: c.cycles === 5 || c.cycles === 6
    }));

    const pad2 = (n) => String(n).padStart(2, '0');

    const formatTime = (date) => {
        let hours = date.getHours();
        const minutes = date.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12 || 12;
        return `${hours}:${pad2(minutes)} ${ampm}`;
    };

    const formatHours = (hours) => {
        const totalMinutes = Math.round(hours * 60);
        const hh = Math.floor(totalMinutes / 60);
        const mm = totalMinutes % 60;
        if (mm === 0) return `${hh} h`;
        return `${hh} h ${mm} min`;
    };

    const isAndroid = () => /Android/i.test(navigator.userAgent);

    const safeVibrate = (ms = 8) => {
        try {
            if (navigator.vibrate) navigator.vibrate(ms);
        } catch (_) {}
    };

    /** Pequeño gradiente de colores para el glow: rojo -> amarillo -> verde */
    const glowColorForCycle = (cycles) => {
        const t = (Math.max(1, Math.min(9, cycles)) - 1) / 8; // 0..1

        // Piecewise: red->yellow (0..0.5), yellow->green (0.5..1)
        const lerp = (a, b, x) => Math.round(a + (b - a) * x);

        let r, g, b;
        if (t <= 0.5) {
            const x = t / 0.5;
            // red (255,60,60) -> yellow (255,210,60)
            r = 255;
            g = lerp(60, 210, x);
            b = 60;
        } else {
            const x = (t - 0.5) / 0.5;
            // yellow (255,210,60) -> green (60,255,150)
            r = lerp(255, 60, x);
            g = lerp(210, 255, x);
            b = lerp(60, 150, x);
        }

        return `rgba(${r}, ${g}, ${b}, 0.55)`;
    };

    /** Estrellas */
    const createStars = (containerId = 'stars-container') => {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Evita duplicar si ya existen (por ejemplo, hot reload)
        if (container.dataset.ready === '1') return;
        container.dataset.ready = '1';

        const area = Math.max(1, window.innerWidth * window.innerHeight);
        const count = Math.min(160, Math.max(90, Math.round(area / 9000)));

        const frag = document.createDocumentFragment();
        for (let i = 0; i < count; i++) {
            const star = document.createElement('div');
            star.className = 'star';

            const size = Math.random() * 2.2 + 1.1; // 1.1px .. 3.3px
            star.style.setProperty('--star-size', `${size}px`);

            star.style.left = `${Math.random() * 100}%`;
            star.style.top = `${Math.random() * 100}%`;

            const twinkle = `${Math.random() * 3.5 + 2.5}s`; // 2.5..6s
            star.style.setProperty('--twinkle', twinkle);

            frag.appendChild(star);
        }
        container.appendChild(frag);
    };

    /** Toast */
    let toastTimer = null;

    const showToast = (message, ms = 2200) => {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.classList.remove('hidden');

        if (toastTimer) window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.add('hidden'), ms);
    };

    /** Clipboard */
    const copyToClipboard = async (text) => {
        try {
            await navigator.clipboard.writeText(text);
            safeVibrate(8);
            showToast(`Copiado: ${text}`);
            return true;
        } catch (_) {
            // Fallback clásico
            try {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.setAttribute('readonly', '');
                ta.style.position = 'fixed';
                ta.style.left = '-9999px';
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                safeVibrate(8);
                showToast(`Copiado: ${text}`);
                return true;
            } catch (e2) {
                showToast('No se pudo copiar automáticamente.');
                return false;
            }
        }
    };

    /** Modal helpers */
    const openModal = (overlayEl) => {
        if (!overlayEl) return;
        overlayEl.classList.remove('hidden');

        // Cerrar al tocar afuera
        const onOverlayClick = (ev) => {
            if (ev.target === overlayEl) closeModal(overlayEl);
        };
        overlayEl._onOverlayClick = onOverlayClick;
        overlayEl.addEventListener('click', onOverlayClick);
    };

    const closeModal = (overlayEl) => {
        if (!overlayEl) return;
        overlayEl.classList.add('hidden');

        if (overlayEl._onOverlayClick) {
            overlayEl.removeEventListener('click', overlayEl._onOverlayClick);
            delete overlayEl._onOverlayClick;
        }
    };

    /** Año automático en footer */
    const applyCurrentYear = () => {
        const yearEl = document.getElementById('year');
        if (!yearEl) return;
        yearEl.textContent = String(new Date().getFullYear());
    };

    /* ==========================================================================
       Wake Lock (pantalla encendida) - mejora extra
       ========================================================================== */

    let wakeLock = null;

    const setWakeLockButtonState = (btn, enabled) => {
        if (!btn) return;
        btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
        btn.textContent = enabled ? 'pantalla encendida: ON' : 'mantener pantalla encendida';
    };

    const requestWakeLock = async () => {
        if (!('wakeLock' in navigator)) return null;
        try {
            return await navigator.wakeLock.request('screen');
        } catch (_) {
            return null;
        }
    };

    const setupWakeLockButton = () => {
        const btn = document.getElementById('wake-lock-btn');
        if (!btn) return;

        setWakeLockButtonState(btn, false);

        btn.addEventListener('click', async () => {
            safeVibrate(10);

            // Toggle
            if (wakeLock) {
                try { await wakeLock.release(); } catch (_) {}
                wakeLock = null;
                setWakeLockButtonState(btn, false);
                showToast('Pantalla encendida: OFF');
                return;
            }

            const lock = await requestWakeLock();
            if (!lock) {
                showToast('Tu navegador no permite Wake Lock.');
                setWakeLockButtonState(btn, false);
                return;
            }

            wakeLock = lock;
            wakeLock.addEventListener('release', () => {
                wakeLock = null;
                setWakeLockButtonState(btn, false);
            });

            setWakeLockButtonState(btn, true);
            showToast('Pantalla encendida: ON');
        });

        // Si el usuario vuelve a la pestaña, intentamos recuperar el lock si estaba activo.
        document.addEventListener('visibilitychange', async () => {
            if (document.visibilityState !== 'visible') return;
            const btnVisible = document.getElementById('wake-lock-btn');
            if (!btnVisible) return;

            // Si el botón está ON pero se perdió el lock, lo pedimos otra vez.
            const pressed = btnVisible.getAttribute('aria-pressed') === 'true';
            if (pressed && !wakeLock) {
                const lock = await requestWakeLock();
                if (lock) {
                    wakeLock = lock;
                    wakeLock.addEventListener('release', () => {
                        wakeLock = null;
                        setWakeLockButtonState(btnVisible, false);
                    });
                    setWakeLockButtonState(btnVisible, true);
                } else {
                    setWakeLockButtonState(btnVisible, false);
                }
            }
        });
    };

    /* ==========================================================================
       Android Intent: crear alarma (mejora: evita mandar a Play Store y añade fallback)
       ========================================================================== */

    const buildAlarmFallbackUrl = (hour24, minute, label) => {
        const url = new URL(window.location.href);
        url.searchParams.set('alarm_fallback', '1');
        url.searchParams.set('h', String(hour24));
        url.searchParams.set('m', String(minute));
        if (label) url.searchParams.set('label', label);
        return url.toString();
    };

    const buildAlarmIntentUrl = (hour24, minute, label) => {
        // Usamos intent:#Intent... (sin host ni scheme) para no forzar data URI.
        // Esto suele ser más compatible con actividades que no declaran <data> en el intent-filter.
        const safeLabel = encodeURIComponent(label || 'SleepTimer');
        const fallback = encodeURIComponent(buildAlarmFallbackUrl(hour24, minute, label || 'SleepTimer'));

        return [
            'intent:#Intent',
            'action=android.intent.action.SET_ALARM',
            'category=android.intent.category.BROWSABLE',
            'category=android.intent.category.DEFAULT',
            `S.android.intent.extra.alarm.MESSAGE=${safeLabel}`,
            `i.android.intent.extra.alarm.HOUR=${Number(hour24)}`,
            `i.android.intent.extra.alarm.MINUTES=${Number(minute)}`,
            `S.browser_fallback_url=${fallback}`,
            'end'
        ].join(';');
    };

    const openAndroidAlarm = ({ hour24, minute, label }) => {
        if (!isAndroid()) {
            showToast('Esta función es solo para telefonos moviles.');
            return false;
        }

        const h = Number(hour24);
        const m = Number(minute);
        if (!Number.isFinite(h) || !Number.isFinite(m)) {
            showToast('Hora inválida para la alarma.');
            return false;
        }

        safeVibrate(12);
        const intentUrl = buildAlarmIntentUrl(h, m, label || 'SleepTimer');

        // Importante: debe ejecutarse por gesto del usuario (click).
        window.location.assign(intentUrl);
        return true;
    };

    const handleAlarmFallback = async () => {
        const url = new URL(window.location.href);
        if (url.searchParams.get('alarm_fallback') !== '1') return;

        const h = Number(url.searchParams.get('h'));
        const m = Number(url.searchParams.get('m'));
        const label = url.searchParams.get('label') || 'SleepTimer';

        const timeText = Number.isFinite(h) && Number.isFinite(m)
            ? `${pad2(h)}:${pad2(m)}`
            : '';

        // Limpia URL (sin recargar)
        url.searchParams.delete('alarm_fallback');
        url.searchParams.delete('h');
        url.searchParams.delete('m');
        url.searchParams.delete('label');
        window.history.replaceState({}, document.title, url.toString());

        showToast('No se pudo abrir la app de reloj automáticamente.');
        if (timeText) {
            await copyToClipboard(timeText);
            showToast(`Hora copiada: ${timeText} · crea la alarma manualmente`);
        }
    };

    /* Export global */
    window.SleepTimer = {
        CYCLES,
        pad2,
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
        isAndroid,
        openAndroidAlarm,
        handleAlarmFallback
    };
})();
