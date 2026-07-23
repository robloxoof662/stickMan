const DOUBLE_TAP_DELAY_MS = 350;

/**
 * Keeps iPad Safari from zooming the full-screen game after rapid taps or
 * pinch gestures. This is intentionally installed at document level because
 * double-tap zoom can be triggered by any non-form element in the game shell.
 */
export function installViewportGuards(): void {
  let lastTouchEnd = 0;

  document.addEventListener(
    "touchend",
    (event) => {
      const now = window.performance.now();
      if (now - lastTouchEnd <= DOUBLE_TAP_DELAY_MS) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false },
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false },
  );

  document.addEventListener(
    "gesturestart",
    (event) => event.preventDefault(),
    { passive: false },
  );
}
