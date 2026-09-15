"use client";

import { useEffect, useRef, useState, useCallback } from "react";

let webgazerInitStarted = false;

export default function GazeTracker({ onGaze, onCalibrated, showVideoPreview = false }) {
  const [status, setStatus] = useState("idle");
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

  useEffect(() => {
    if (scriptLoadedRef.current) return;
    scriptLoadedRef.current = true;

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
          .setRegression("ridge")
          .setGazeListener((data, timestamp) => {
            if (!data) return;
            onGaze?.({ x: data.x, y: data.y, t: timestamp });
          })
          .saveDataAcrossSessions(false);

        await webgazer.begin();

        webgazer.showVideoPreview(showVideoPreview);
        webgazer.showPredictionPoints(false);
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
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const registerCalibrationClick = useCallback(
    (pointIndex) => (e) => {
      const webgazer = webgazerRef.current;
      if (!webgazer) return;

      webgazer.recordScreenPosition(e.clientX, e.clientY, "click");

      setCalibrationHits((prev) => ({
        ...prev,
        [pointIndex]: (prev[pointIndex] || 0) + 1,
      }));
    },
    []
  );

  useEffect(() => {
    if (status !== "calibrating") return;
    const allDone = CALIBRATION_POINTS.every(
      (_, i) => (calibrationHits[i] || 0) >= CLICKS_NEEDED_PER_POINT
    );
    if (allDone) {
      setStatus("tracking");
      onCalibrated?.();
    }
  }, [calibrationHits, status, onCalibrated]); // eslint-disable-line react-hooks/exhaustive-deps

  if (status === "error") {
    return (
      <div style={styles.messageBoxError}>
        {error}
      </div>
    );
  }

  if (status === "idle" || status === "loading") {
    return <div style={styles.messageBox}>Loading gaze tracker…</div>;
  }

  if (status === "permission") {
    return (
      <div style={styles.messageBox}>
        Requesting webcam access — please allow it in the browser prompt.
      </div>
    );
  }

  if (status === "calibrating") {
    return (
      <div style={styles.overlay}>
        <div style={styles.overlayText}>
          <p style={{ fontWeight: 600, marginBottom: 4 }}>Calibrating gaze tracker</p>
          <p style={{ fontSize: 14, color: "#cbd5e1" }}>
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
              style={{
                ...styles.dot,
                left: `${xPct}%`,
                top: `${yPct}%`,
                backgroundColor: done ? "#4ade80" : "rgba(251,191,36,0.8)",
                borderColor: done ? "#86efac" : "#fde68a",
              }}
              aria-label={`Calibration point ${i + 1}, ${hits}/${CLICKS_NEEDED_PER_POINT} clicks`}
            >
              <span style={styles.srOnly}>{hits}/{CLICKS_NEEDED_PER_POINT}</span>
            </button>
          );
        })}
      </div>
    );
  }

  return null;
}

const styles = {
  messageBox: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#f8fafc",
    border: "1px solid #e2e8f0",
    color: "#475569",
    fontSize: 14,
  },
  messageBoxError: {
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fef2f2",
    border: "1px solid #fecaca",
    color: "#b91c1c",
    fontSize: 14,
  },
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(15,23,42,0.95)",
    zIndex: 9999,
    color: "#fff",
  },
  overlayText: {
    position: "absolute",
    top: 24,
    left: "50%",
    transform: "translateX(-50%)",
    textAlign: "center",
    maxWidth: 400,
    padding: "0 16px",
  },
  dot: {
    position: "absolute",
    transform: "translate(-50%, -50%)",
    width: 32,
    height: 32,
    borderRadius: "50%",
    border: "2px solid",
    cursor: "pointer",
  },
  srOnly: {
    position: "absolute",
    width: 1,
    height: 1,
    overflow: "hidden",
    clip: "rect(0,0,0,0)",
  },
};