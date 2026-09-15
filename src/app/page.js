"use client";

import { useState, useEffect, useRef } from "react";
import GazeTracker from "./GazeTracker";
import Toolbar from "./components/Toolbar";

const CALIB_DOTS = [
  { id: "Top-Left", top: 10, left: 10 },
  { id: "Top-Center", top: 10, left: 50 },
  { id: "Top-Right", top: 10, left: 90 },
  { id: "Mid-Left", top: 50, left: 10 },
  { id: "Mid-Center", top: 50, left: 50 },
  { id: "Mid-Right", top: 50, left: 90 },
  { id: "Bottom-Left", top: 90, left: 10 },
  { id: "Bottom-Center", top: 90, left: 50 },
  { id: "Bottom-Right", top: 90, left: 90 },
];

const mapRange = (val, inMin, inMax, outMin, outMax) => {
  return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

const clamp = (val, min, max) => {
  return Math.max(min, Math.min(max, val));
};

const THEMES = {
  light: { bg: "#fafafa", text: "#222222", name: "Standard" },
  sepia: { bg: "#f4ecd8", text: "#5c4033", name: "Sepia (Low Glare)" },
  dark: { bg: "#121212", text: "#e0e0e0", name: "Dark Mode" },
  contrast: { bg: "#000000", text: "#ffff00", name: "High Contrast" }
};

export default function Home() {
  const [gazeData, setGazeData] = useState(null);
  
  const [calibState, setCalibState] = useState("idle");
  const [calibIndex, setCalibIndex] = useState(0);
  const [rawPoints, setRawPoints] = useState([]);
  const [bounds, setBounds] = useState(null);
  const [calibError, setCalibError] = useState(false);

  const [cursor, setCursor] = useState({ x: 50, y: 50 });
  const [rulerY, setRulerY] = useState(35);
  const targetYRef = useRef(35);
  const currentYRef = useRef(35);

  const [fontSize, setFontSize] = useState("1.25rem");
  const [lineHeight, setLineHeight] = useState("2.2");
  const [letterSpacing, setLetterSpacing] = useState("normal");
  const [activeTheme, setActiveTheme] = useState("sepia");
  const [focusRulerEnabled, setFocusRulerEnabled] = useState(true);

  const handleGazeUpdate = (data) => {
    setGazeData(data);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === "Space" && calibState === "calibrating" && gazeData) {
        e.preventDefault();
        
        const currentPoint = {
          x: 1 - parseFloat(gazeData.x),
          y: parseFloat(gazeData.y)
        };

        const newPoints = [...rawPoints, currentPoint];
        setRawPoints(newPoints);

        if (calibIndex < 8) {
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
    const camX_Left = (points[0].x + points[3].x + points[6].x) / 3;
    const camX_Center = (points[1].x + points[4].x + points[7].x) / 3;
    const camX_Right = (points[2].x + points[5].x + points[8].x) / 3;
    
    const camY_Top = (points[0].y + points[1].y + points[2].y) / 3;
    const camY_Center = (points[3].y + points[4].y + points[5].y) / 3;
    const camY_Bottom = (points[6].y + points[7].y + points[8].y) / 3;

    if (Math.abs(camX_Right - camX_Left) < 0.002 || Math.abs(camY_Bottom - camY_Top) < 0.002) {
      setCalibError(true);
      setCalibState("done");
      return;
    }

    setBounds({
      xLeft: camX_Left,
      xCenter: camX_Center,
      xRight: camX_Right,
      yTop: camY_Top,
      yCenter: camY_Center,
      yBottom: camY_Bottom
    });
    
    setCalibError(false);
    setCalibState("done");
  };

  useEffect(() => {
    if (!gazeData) return;

    const rawX = 1 - parseFloat(gazeData.x);
    const rawY = parseFloat(gazeData.y);

    let cX = 50;
    let cY = 35;

    if (calibState === "done" && bounds && !calibError) {
      let rawCursorX, rawCursorY;

      if (rawX < bounds.xCenter) {
        rawCursorX = mapRange(rawX, bounds.xLeft, bounds.xCenter, 10, 50);
      } else {
        rawCursorX = mapRange(rawX, bounds.xCenter, bounds.xRight, 50, 90);
      }

      if (rawY < bounds.yCenter) {
        rawCursorY = mapRange(rawY, bounds.yTop, bounds.yCenter, 15, 35);
      } else {
        rawCursorY = mapRange(rawY, bounds.yCenter, bounds.yBottom, 35, 65);
      }

      cX = clamp(rawCursorX, 2, 98);
      cY = clamp(rawCursorY, 15, 70);
    } else {
      cX = clamp(rawX * 100, 2, 98);
      cY = clamp(rawY * 100, 15, 70);
    }

    setCursor({ x: cX, y: cY });
    targetYRef.current = cY;
  }, [gazeData, calibState, bounds, calibError]);

  useEffect(() => {
    let animationFrameId;
    const updateRuler = () => {
      currentYRef.current += (targetYRef.current - currentYRef.current) * 0.08;
      setRulerY(currentYRef.current);
      animationFrameId = requestAnimationFrame(updateRuler);
    };
    animationFrameId = requestAnimationFrame(updateRuler);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const currentTheme = THEMES[activeTheme];

  return (
    <main style={{ minHeight: "100vh", position: "relative", fontFamily: "sans-serif", backgroundColor: currentTheme.bg, color: currentTheme.text, transition: "background-color 0.3s, color 0.3s" }}>
      
      {/* EXTRACTED TOOLBAR COMPONENT */}
      <Toolbar 
        calibState={calibState}
        calibError={calibError}
        onStartCalibration={() => { setCalibState("calibrating"); setCalibError(false); }}
        onRecalibrate={() => { setCalibState("idle"); setCalibIndex(0); setRawPoints([]); }}
        activeTheme={activeTheme}
        setActiveTheme={setActiveTheme}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        letterSpacing={letterSpacing}
        setLetterSpacing={setLetterSpacing}
        focusRulerEnabled={focusRulerEnabled}
        setFocusRulerEnabled={setFocusRulerEnabled}
        themes={THEMES}
      />

      <div style={{ position: "absolute", top: "120px", right: "40px", zIndex: 100 }}>
        <GazeTracker onGazeUpdate={handleGazeUpdate} />
      </div>

      {/* READING PASSAGE */}
      <div style={{ maxWidth: "800px", margin: "60px auto", padding: "0 20px" }}>
        <h2 style={{ fontSize: "2.5rem", marginBottom: "30px" }}>The History of Typography</h2>
        
        <div style={{ 
          fontSize: fontSize, 
          lineHeight: lineHeight, 
          letterSpacing: letterSpacing,
          transition: "font-size 0.2s, line-height 0.2s, letter-spacing 0.2s" 
        }}>
          <p style={{ marginBottom: "25px" }}>
            Typography is the art and technique of arranging type to make written language legible, 
            readable, and appealing when displayed. The arrangement of type involves selecting typefaces, 
            point sizes, line lengths, line-spacing, and letter-spacing.
          </p>
          <p style={{ marginBottom: "25px" }}>
            The term typography is also applied to the style, arrangement, and appearance of the letters, 
            numbers, and symbols created by the process. Type design is a closely related craft, sometimes 
            considered part of typography.
          </p>
          <p style={{ marginBottom: "25px" }}>
            For readers with dyslexia, specific typographic adjustments can significantly improve reading 
            speed and comprehension. Larger font sizes, increased spacing between lines, and the use of 
            sans-serif typefaces reduce the visual crowding that causes letters to blur or merge together.
          </p>
          <p style={{ marginBottom: "25px" }}>
            By tracking where the eyes are focused, reading interfaces can dynamically adapt. A focus 
            ruler can highlight the current sentence, guiding the eye horizontally and preventing the 
            reader from skipping lines or losing their place in dense blocks of text.
          </p>
        </div>
      </div>

      {/* FOCUS RULER */}
      {calibState === "done" && !calibError && focusRulerEnabled && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: `${rulerY}vh`,
            width: "100vw",
            height: "90px", 
            backgroundColor: "rgba(255, 235, 59, 0.25)", 
            borderTop: "2px solid rgba(255, 200, 0, 0.5)",
            borderBottom: "2px solid rgba(255, 200, 0, 0.5)",
            transform: "translateY(-50%)", 
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
      )}

      {/* CALIBRATION OVERLAY */}
      {calibState === "calibrating" && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(255,255,255,0.95)", zIndex: 9999, color: "#000" }}>
          <h2 style={{ textAlign: "center", marginTop: "40px" }}>
            Look at the red dot and press the SPACEBAR. ({calibIndex + 1}/9)
          </h2>
          <div
            style={{
              position: "absolute",
              top: `${CALIB_DOTS[calibIndex].top}%`,
              left: `${CALIB_DOTS[calibIndex].left}%`,
              width: "30px", height: "30px",
              backgroundColor: "red", borderRadius: "50%",
              transform: "translate(-50%, -50%)",
              boxShadow: "0 0 15px rgba(255,0,0,0.5)"
            }}
          />
        </div>
      )}

      {/* EYE CURSOR */}
      {gazeData && calibState !== "calibrating" && (
        <div
          style={{
            position: "fixed",
            left: `${cursor.x}vw`,
            top: `${cursor.y}vh`,
            width: "8px", height: "8px", 
            backgroundColor: calibState === "done" && !calibError ? "blue" : "red",
            borderRadius: "50%",
            transform: "translate(-50%, -50%)",
            pointerEvents: "none",
            zIndex: 9999,
          }}
        />
      )}
    </main>
  );
}