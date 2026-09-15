"use client";

import { useRef, useState, useCallback } from "react";

export function useReadingBehavior({
  regressionWindowMs = 4000,
  fatigueOffTextMs = 3000,
} = {}) {
  const lineRectsRef = useRef({});
  const lastLineRef = useRef(null);
  const lineEnterTimeRef = useRef(null);
  const regressionTimestampsRef = useRef([]);
  const offTextSinceRef = useRef(null);

  const [signals, setSignals] = useState({
    currentLineIndex: null,
    dwellMs: 0,
    regressionCount: 0,
    fatigueFlag: false,
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
      const { x, y, t } = sample;
      const rects = lineRectsRef.current;
      const TOLERANCE_Y = 25;

      let hitLine = null;
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

      const now = t || Date.now();

      if (hitLine === null) {
        if (offTextSinceRef.current === null) offTextSinceRef.current = now;
        const offDuration = now - offTextSinceRef.current;
        setSignals((prev) => ({
          ...prev,
          fatigueFlag: offDuration >= fatigueOffTextMs,
        }));
        return;
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
      });
    },
    [regressionWindowMs, fatigueOffTextMs]
  );

  return { feed, signals, registerLineRefs, recalcLineRects };
}