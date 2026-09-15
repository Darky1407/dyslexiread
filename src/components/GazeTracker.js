"use client";

import { useEffect, useRef, useState, useCallback } from "react";

// Module-level (not component-level) flag — persists across React Strict
// Mode's intentional double-invoke of effects in dev, so we never call
// webgazer.begin() a second time while the first call is still mid-setup
// (that race is what causes WebGazer's internal "t is not a function" crash).
let webgazerInitStarted = false;

/**
 * GazeTracker
 * ------------
 * Loads WebGazer.js at runtime (it's not npm-import safe because it touches
 * `window`/`document` on load), runs a 9-point calibration, then streams
 * {x, y, t} gaze samples to the parent via onGaze().
 *
 * Props:
 *  - onGaze(sample)      called on every gaze prediction: { x, y, t }
 *  - onCalibrated()      called once calibration is complete
 *  - showVideoPreview    boolean, show the little webcam preview WebGazer draws
 */
export default function GazeTracker({ onGaze, onCalibrated, showVideoPreview = false }) {
  const [status, setStatus] = useState("idle"); // idle | loading | permission | calibrating | tracking | error
  const [error, setError] = useState(null);
  const [calibrationHits, setCalibrationHits] = useState({});
  const webgazerRef = useRef(null);
  const scriptLoadedRef = useRef(false);

  const CALIBRATION_POINTS = [
    [5, 5], [50, 5], [95, 5],
    [5, 50], [50, 50], [95, 50],
    [5, 95], [50, 95], [95, 95],
  ];
  const CLICKS_NEEDED_PER_POINT = 5;

  // 1. Inject the WebGazer script tag once on mount
  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

    // Strict Mode already ran this effect once (mount -> cleanup -> mount).
    // If WebGazer already started initializing, don't touch the script tag
    // or call begin() again — just bail, the first run owns the lifecycle.
    if (webgazerInitStarted) return;
    webgazerInitStarted = true;

    setStatus("loading");

    const script = document.createElement("script");
    script.src = "https://webgazer.cs.brown.edu/webgazer.js";
    script.async = true;

    script.onload = async () => {
      try {
        setStatus("permission");
        const webgazer = window.webgazer;
        webgazerRef.current = webgazer;

        webgazer
          .setTracker("clmtrackr") // avoids the TFFacemesh/mediapipe wasm files
          // that 404 when served from a local dev server instead of a CDN
          .setRegression("ridge")
          .setGazeListener((data, timestamp) => {
            if (!data) return; // no face detected this frame
            onGaze?.({ x: data.x, y: data.y, t: timestamp });
          })
          .saveDataAcrossSessions(false);

        await webgazer.begin(); // this triggers the webcam permission prompt

        webgazer.showVideoPreview(showVideoPreview);
        webgazer.showPredictionPoints(false); // we'll draw our own if needed
        webgazer.showFaceOverlay(false);
        webgazer.showFaceFeedbackBox(false);

        setStatus("calibrating");
      } catch (err) {
        console.error("WebGazer init failed:", err);
        setError(
          err?.message?.includes("Permission")
            ? "Webcam permission was denied. Please allow camera access and reload."
            : "Could not start webcam tracking. Check console for details."
        );
        setStatus("error");
      }
    };

    script.onerror = () => {
      setError("Failed to load WebGazer.js — check your internet connection.");
      setStatus("error");
    };

    document.body.appendChild(script);

    // No cleanup/teardown here on purpose: React Strict Mode fires this
    // effect's cleanup between its two dev-mode mounts, and calling
    // webgazer.end() mid-init is what corrupts it. For a hackathon demo,
    // the webcam releasing on full page reload/navigation is good enough —
    // if you need explicit teardown later (e.g. a "stop tracking" button),
    // call webgazerRef.current?.end() from that button's handler instead.
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const registerCalibrationClick = useCallback(
    (pointIndex) => (e) => {
      const webgazer = webgazerRef.current;
      if (!webgazer) return;

      // Feed this click to WebGazer's own regression model as a training point
      webgazer.recordScreenPosition(e.clientX, e.clientY, "click");

      setCalibrationHits((prev) => {
        const next = { ...prev, [pointIndex]: (prev[pointIndex] || 0) + 1 };
        const allDone = CALIBRATION_POINTS.every(
          (_, i) => (next[i] || 0) >= CLICKS_NEEDED_PER_POINT
        );
        if (allDone) {
          setStatus("tracking");
          onCalibrated?.();
        }
        return next;
      });
    },
    [onCalibrated]
  );

  if (status === "error") {
    return (
      <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
        {error}
      </div>
    );
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm">
        Loading gaze tracker…
      </div>
    );
  }

  if (status === "permission") {
    return (
      <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 text-sm">
        Requesting webcam access — please allow it in the browser prompt.
      </div>
    );
  }

  if (status === "calibrating") {
    return (
      <div className="fixed inset-0 bg-slate-900/95 z-50 text-white">
        <div className="absolute top-6 left-1/2 -translate-x-1/2 text-center max-w-md px-4">
          <p className="font-semibold mb-1">Calibrating gaze tracker</p>
          <p className="text-sm text-slate-300">
            Look at each dot and click it {CLICKS_NEEDED_PER_POINT} times.
            Keep your head roughly still and centered on the webcam.
          </p>
        </div>
        {CALIBRATION_POINTS.map(([xPct, yPct], i) => {
          const hits = calibrationHits[i] || 0;
          const done = hits >= CLICKS_NEEDED_PER_POINT;
          return (
            <button
              key={i}
              onClick={registerCalibrationClick(i)}
              style={{ left: `${xPct}%`, top: `${yPct}%` }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full border-2 transition-colors
                ${done ? "bg-green-400 border-green-300" : "bg-amber-400/80 border-amber-200 hover:bg-amber-300"}`}
              aria-label={`Calibration point ${i + 1}, ${hits}/${CLICKS_NEEDED_PER_POINT} clicks`}
            >
              <span className="sr-only">{hits}/{CLICKS_NEEDED_PER_POINT}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // status === "tracking" — calibration done, nothing to render (invisible tracker)
  return null;
}