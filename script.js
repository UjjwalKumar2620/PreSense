/* ============================================
   PRESENSE CAM — Interactive Camera Controller
   Fullscreen + Reversed cursor + Idle Glow
   ============================================ */

(function () {
    'use strict';

    const TOTAL_FRAMES = 192;
    const FRAME_PATH = 'ezgif-32175e74363a0928-jpg/ezgif-frame-';
    const FRAME_EXT = '.jpg';
    const LERP_SPEED = 0.08;
    const PRELOAD_BATCH = 16;
    const IDLE_DELAY = 400; // ms before glow activates

    let images = new Array(TOTAL_FRAMES);
    let loadedCount = 0;
    let currentFrame = 0;
    let targetFrame = Math.floor(TOTAL_FRAMES / 2);
    let displayedFrame = -1;
    let isReady = false;
    let hasInteracted = false;

    // Idle glow state
    let idleTimer = null;
    let isIdle = false;
    let glowIntensity = 0; // 0 to 1, smoothly animated

    const canvas = document.getElementById('cameraCanvas');
    const ctx = canvas.getContext('2d');
    const preloader = document.getElementById('preloader');
    const preloaderBar = document.getElementById('preloaderBar');
    const preloaderPercent = document.getElementById('preloaderPercent');
    const cursorHint = document.getElementById('cursorHint');
    const statusBar = document.getElementById('statusBar');
    const trackingAngle = document.getElementById('trackingAngle');
    const frameCounter = document.getElementById('frameCounter');
    const glowOverlay = document.getElementById('glowOverlay');

    function padFrame(n) {
        return String(n).padStart(3, '0');
    }

    // --- Idle glow management ---
    function startIdleGlow() {
        isIdle = true;
        idleAnchorFrame = currentFrame; // Lock the center point for oscillation
        glowOverlay.classList.add('active');
    }

    function stopIdleGlow() {
        isIdle = false;
        glowOverlay.classList.remove('active');
        glowIntensity = 0;
    }

    function resetIdleTimer() {
        // Mouse is moving — kill the glow
        if (isIdle) stopIdleGlow();

        clearTimeout(idleTimer);
        idleTimer = setTimeout(startIdleGlow, IDLE_DELAY);
    }

    // --- Preload all frames ---
    function preloadImages() {
        return new Promise((resolve) => {
            let loaded = 0;

            function loadImage(index) {
                return new Promise((res) => {
                    const img = new Image();
                    img.onload = () => {
                        images[index] = img;
                        loaded++;
                        const pct = Math.round((loaded / TOTAL_FRAMES) * 100);
                        preloaderBar.style.width = pct + '%';
                        preloaderPercent.textContent = pct + '%';
                        res();
                    };
                    img.onerror = () => { loaded++; res(); };
                    img.src = FRAME_PATH + padFrame(index + 1) + FRAME_EXT;
                });
            }

            async function loadBatches() {
                for (let i = 0; i < TOTAL_FRAMES; i += PRELOAD_BATCH) {
                    const batch = [];
                    for (let j = i; j < Math.min(i + PRELOAD_BATCH, TOTAL_FRAMES); j++) {
                        batch.push(loadImage(j));
                    }
                    await Promise.all(batch);
                }
                resolve();
            }

            loadBatches();
        });
    }

    // --- Canvas fills the entire viewport ---
    function setupCanvas() {
        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // --- Draw frame covering full viewport ---
    function drawFrame(frameIndex, forceRedraw) {
        const idx = Math.max(0, Math.min(TOTAL_FRAMES - 1, Math.round(frameIndex)));
        if (idx === displayedFrame && !forceRedraw) return;
        displayedFrame = idx;

        const img = images[idx];
        if (!img) return;

        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const iw = img.naturalWidth;
        const ih = img.naturalHeight;

        // Cover-fit with more aggressive zoom (1.15x) and slight vertical shift to hide watermarks
        const scale = Math.max(vw / iw, vh / ih) * 1.15;
        const dw = iw * scale;
        const dh = ih * scale;
        const dx = (vw - dw) / 2;
        const dy = ((vh - dh) / 2) - 20; // Shift up slightly to ensure bottom corner is gone

        ctx.clearRect(0, 0, vw, vh);

        // Apply brightness boost when idle (neon glow on the canvas itself)
        if (glowIntensity > 0.01) {
            ctx.save();
            ctx.filter = `brightness(${1 + glowIntensity * 0.25}) saturate(${1 + glowIntensity * 0.3})`;
            ctx.drawImage(img, dx, dy, dw, dh);
            ctx.restore();
        } else {
            ctx.drawImage(img, dx, dy, dw, dh);
        }

        // Update HUD
        const anglePct = idx / (TOTAL_FRAMES - 1);
        const angle = Math.round((anglePct - 0.5) * 180);
        trackingAngle.textContent = (angle >= 0 ? '+' : '') + angle + '°';
        frameCounter.textContent = padFrame(idx + 1) + ' / ' + TOTAL_FRAMES;
    }

    // --- Mouse tracking ---
    function handleMouseMove(e) {
        if (!isReady) return;

        if (!hasInteracted) {
            hasInteracted = true;
            cursorHint.classList.add('hidden');
        }

        const x = e.clientX;
        const w = window.innerWidth;
        const normalizedX = Math.max(0, Math.min(1, x / w));
        targetFrame = (1 - normalizedX) * (TOTAL_FRAMES - 1);

        resetIdleTimer();
    }

    // --- Touch tracking ---
    function handleTouchMove(e) {
        if (!isReady) return;
        e.preventDefault();

        if (!hasInteracted) {
            hasInteracted = true;
            cursorHint.classList.add('hidden');
        }

        const touch = e.touches[0];
        const normalizedX = Math.max(0, Math.min(1, touch.clientX / window.innerWidth));
        targetFrame = (1 - normalizedX) * (TOTAL_FRAMES - 1);

        resetIdleTimer();
    }

    // --- Animation loop ---
    const IDLE_OSCILLATION_RANGE = 35;  // ±35 frames when idle — wide sweep, no repetitive feel
    const IDLE_OSCILLATION_SPEED = 0.001; // Slow, gentle pace
    let idleOscPhase = 0;               // Tracks oscillation position
    let idleAnchorFrame = 0;            // The frame where cursor stopped
    let idleBlend = 0;                  // 0→1 smooth ramp into idle oscillation

    function animate() {
        const now = performance.now();

        if (isIdle) {
            // Smoothly ramp into idle oscillation
            idleBlend = Math.min(1, idleBlend + 0.015);

            // Sine-wave oscillation around the anchor point
            idleOscPhase = now * IDLE_OSCILLATION_SPEED;
            const oscOffset = Math.sin(idleOscPhase) * IDLE_OSCILLATION_RANGE * idleBlend;

            // Clamp to valid frame range
            const oscFrame = Math.max(0, Math.min(TOTAL_FRAMES - 1, idleAnchorFrame + oscOffset));
            currentFrame += (oscFrame - currentFrame) * 0.06;
        } else {
            // Normal cursor-tracking lerp
            idleBlend = 0;
            currentFrame += (targetFrame - currentFrame) * LERP_SPEED;
        }

        // Smoothly animate glow intensity
        const glowTarget = isIdle ? 1 : 0;
        glowIntensity += (glowTarget - glowIntensity) * 0.04;

        // Sine-wave pulse on the brightness glow
        let effectiveGlow = glowIntensity;
        if (isIdle && glowIntensity > 0.3) {
            const pulse = Math.sin(now * 0.002) * 0.5 + 0.5;
            effectiveGlow = glowIntensity * (0.6 + 0.4 * pulse);
        }

        // Force redraw when glow or oscillation is active
        const needsRedraw = Math.abs(glowIntensity - glowTarget) > 0.005 || isIdle || idleBlend > 0.01;
        glowIntensity = effectiveGlow;
        drawFrame(currentFrame, needsRedraw);

        if (!isIdle) {
            glowIntensity = effectiveGlow;
        }

        requestAnimationFrame(animate);
    }

    // --- Init ---
    async function init() {
        currentFrame = Math.floor(TOTAL_FRAMES / 2);
        targetFrame = currentFrame;

        setupCanvas();
        await preloadImages();

        isReady = true;
        drawFrame(currentFrame);

        preloader.classList.add('hidden');

        setTimeout(() => {
            statusBar.classList.add('visible');
        }, 400);

        // Start idle timer immediately so there's glow on first load
        idleTimer = setTimeout(startIdleGlow, 1500);

        animate();

        window.addEventListener('mousemove', handleMouseMove, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });

        window.addEventListener('resize', () => {
            setupCanvas();
            displayedFrame = -1;
            drawFrame(currentFrame, true);
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

