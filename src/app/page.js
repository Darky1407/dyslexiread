"use client";

import { useState, useEffect } from "react";
import GazeTracker from "./GazeTracker";

const CALIB_DOTS = [
  { id: "Top-Left", top: 10, left: 10 },
  { id: "Top-Right", top: 10, left: 90 },
  { id: "Bottom-Right", top: 90, left: 90 },
  { id: "Bottom-Left", top: 90, left: 10 },
];

export default function Home() {
  const [gazeData, setGazeData] = useState(null);
  
  const [calibState, setCalibState] = useState("idle");
  const [calibIndex, setCalibIndex] = useState(0);
  const [rawPoints, setRawPoints] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [calibError, setCalibError] = useState(false);

  const handleGazeUpdate = (data) => {
    setGazeData(data);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && calibState === "calibrating" && gazeData) {
        e.preventDefault();
        
        // FIX 1: We invert the X coordinate instantly so Left=0 and Right=1
        // This matches standard screen coordinates and stops the math from breaking.
        const currentPoint = {
          x: 1 - parseFloat(gazeData.x),
          y: parseFloat(gazeData.y)
        };

        const newPoints = [...rawPoints, currentPoint];
        setRawPoints(newPoints);

        if (calibIndex < 3) {
          setCalibIndex((prev) => prev + 1);
        } else {
          finishCalibration(newPoints);
        }
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [calibState, calibIndex, gazeData, rawPoints]);

  const finishCalibration = (points) => {
    const camX_Left = (points[0].x + points[3].x) / 2;
    const camX_Right = (points[1].x + points[2].x) / 2;
    
    const camY_Top = (points[0].y + points[1].y) / 2;
    const camY_Bottom = (points[2].y + points[3].y) / 2;

    // FIX: Lowered the threshold from 0.01 down to 0.002
    // This allows for the extremely tiny iris movements typical on laptop webcams.
    // We keep a small check just to prevent "divide by zero" math explosions.
    if (Math.abs(camX_Right - camX_Left) < 0.002 || Math.abs(camY_Bottom - camY_Top) < 0.002) {
      setCalibError(true);
      setCalibState("done");
      return;
    }

    setBounds({
      xLeft: camX_Left,
      xRight: camX_Right,
      yTop: camY_Top,
      yBottom: camY_Bottom
    });
    
    setCalibError(false);
    setCalibState("done");
  };

  const mapRange = (val, inMin, inMax, outMin, outMax) => {
    return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  };

  const clamp = (val, min, max) => {
    return Math.max(min, Math.min(max, val));
  };

  let cursorX = 50; 
  let cursorY = 50; 

  if (gazeData) {
    // FIX 3: Apply the same inversion to the live gaze data
    const rawX = 1 - parseFloat(gazeData.x);
    const rawY = parseFloat(gazeData.y);

    if (calibState === "done" && bounds && !calibError) {
      let rawCursorX = mapRange(rawX, bounds.xLeft, bounds.xRight, 10, 90);
      let rawCursorY = mapRange(rawY, bounds.yTop, bounds.yBottom, 10, 90);

      cursorX = clamp(rawCursorX, 2, 98);
      cursorY = clamp(rawCursorY, 2, 98);
    } else {
      // Uncalibrated / Error fallback
      cursorX = clamp(rawX * 100, 2, 98);
      cursorY = clamp(rawY * 100, 2, 98);
    }
  }

  return (
    <main style={{ minHeight: "100vh", position: "relative", fontFamily: "sans-serif", overflow: "hidden" }}>
      
      <div style={{ padding: "40px" }}>
        <h1>DyslexiRead</h1>
        
        {calibState === "idle" && (
          <div>
            <p>We need to calibrate the eye tracker to your screen.</p>
            <p style={{ fontSize: "14px", color: "#666" }}>
              <b>Tip:</b> Keep your head perfectly still. ONLY move your eyes to the dots.
            </p>
            <button 
              onClick={() => { setCalibState("calibrating"); setCalibError(false); }}
              style={{ padding: "10px 20px", fontSize: "16px", cursor: "pointer" }}
            >
              Start Calibration
            </button>
          </div>
        )}

        {calibState === "done" && (
          <div>
            {calibError ? (
              <p style={{ color: "red", fontWeight: "bold" }}>⚠️ Calibration failed: Eye movement too small.</p>
            ) : (
              <p style={{ color: "green", fontWeight: "bold" }}>✅ Calibration Complete!</p>
            )}
            <button 
              onClick={() => { setCalibState("idle"); setCalibIndex(0); setRawPoints([]); }}
              style={{ padding: "5px 10px", marginTop: "10px", cursor: "pointer" }}
            >
              Recalibrate
            </button>
          </div>
        )}
      </div>

      <div style={{ position: "absolute", top: "20px", right: "20px" }}>
        <GazeTracker onGazeUpdate={handleGazeUpdate} />
      </div>

      {calibState === "calibrating" && (
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(255,255,255,0.9)", zIndex: 50 }}>
          <h2 style={{ textAlign: "center", marginTop: "40px" }}>
            Look at the red dot and press the SPACEBAR. ({calibIndex + 1}/4)
          </h2>
          
          <div
            style={{
              position: "absolute",
              top: `${CALIB_DOTS[calibIndex].top}%`,
              left: `${CALIB_DOTS[calibIndex].left}%`,
              width: "30px",
              height: "30px",
              backgroundColor: "red",
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 15px rgba(255,0,0,0.5)"
            }}
          />
        </div>
      )}

      {gazeData && calibState !== "calibrating" && (
        <div
          style={{
            position: "fixed",
            left: `${cursorX}vw`,
            top: `${cursorY}vh`,
            width: "20px",
            height: "20px",
            backgroundColor: (calibState === "done" && !calibError) ? "blue" : "red",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 9999,
            transition: "left 0.1s ease-out, top 0.1s ease-out" 
          }}
        />
      )}
    </main>
  );
}