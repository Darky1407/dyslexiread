"use client";

import { useRef, useState, useCallback } from "react";

export function useReadingBehavior({
  regressionWindowMs = 4000,
  fatigueOffTextMs = 2000,
} = {}) {
  const lineRectsRef = useRef({});
  const lastLineRef = useRef(null);
  const lineEnterTimeRef = useRef(null);
  const regressionTimestampsRef = useRef([]);
  const offTextSinceRef = useRef(null);
  const wasFatiguedRef = useRef(false);

  const [signals, setSignals] = useState({
    currentLineIndex: null,
    dwellMs: 0,
    regressionCount: 0,
    fatigueFlag: false,
    lookingAway: false,
  });

  const registerLineRefs = useCallback(
    (index) => (el) => {
      if (el) {
        lineRectsRef.current[index] = el.getBoundingClientRect();
      } else {
        delete lineRectsRef.current[index];
      }
    },
    []
  );

  const recalcLineRects = useCallback(() => {
    Object.keys(lineRectsRef.current).forEach((key) => {
      const el = document.querySelector(`[data-line-index="${key}"]`);
      if (el) lineRectsRef.current[key] = el.getBoundingClientRect();
    });
  }, []);

  const feed = useCallback(
    (sample) => {
      const { x, y, t, faceDetected = true } = sample;
      const rects = lineRectsRef.current;
      const TOLERANCE_Y = 25;

      let hitLine = null;
      if (faceDetected) {
        for (const [key, rect] of Object.entries(rects)) {
          if (
            x >= rect.left - 40 &&
            x <= rect.right + 40 &&
            y >= rect.top - TOLERANCE_Y &&
            y <= rect.bottom + TOLERANCE_Y
          ) {
            hitLine = Number(key);
            break;
          }
        }
      }

      const now = t || Date.now();

      // If face is not detected or gaze is off-text / off-screen
      if (hitLine === null || !faceDetected) {
        if (offTextSinceRef.current === null) offTextSinceRef.current = now;
        const offDuration = now - offTextSinceRef.current;
        const isFatigued = offDuration >= fatigueOffTextMs;

        if (isFatigued && !wasFatiguedRef.current) {
          wasFatiguedRef.current = true;
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("dyslexifit:gaze", {
                detail: { type: "fatigue_strain", active: true },
              })
            );
          }
        }

        setSignals((prev) => ({
          ...prev,
          fatigueFlag: isFatigued,
          lookingAway: isFatigued,
        }));
        return;
      }

      // Looking back at text
      if (wasFatiguedRef.current) {
        wasFatiguedRef.current = false;
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("dyslexifit:gaze", {
              detail: { type: "fatigue_strain", active: false },
            })
          );
        }
      }
      offTextSinceRef.current = null;

      if (lastLineRef.current === null) {
        lastLineRef.current = hitLine;
        lineEnterTimeRef.current = now;
      } else if (hitLine !== lastLineRef.current) {
        if (hitLine < lastLineRef.current) {
          regressionTimestampsRef.current.push(now);
          regressionTimestampsRef.current = regressionTimestampsRef.current.filter(
            (ts) => now - ts <= regressionWindowMs
          );
        }
        lastLineRef.current = hitLine;
        lineEnterTimeRef.current = now;
      }

      const dwellMs = now - (lineEnterTimeRef.current || now);

      setSignals({
        currentLineIndex: hitLine,
        dwellMs,
        regressionCount: regressionTimestampsRef.current.length,
        fatigueFlag: false,
        lookingAway: false,
      });
    },
    [regressionWindowMs, fatigueOffTextMs]
  );

  return { feed, signals, registerLineRefs, recalcLineRects };
}