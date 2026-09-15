"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import GazeTracker from "./GazeTracker";
import Toolbar from "../components/Toolbar";
import { parseBionic } from "../components/bionicParser";
import { useReadingBehavior } from "../components/useReadingBehavior";

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

const INITIAL_PASSAGES = [
  "Typography is the art and technique of arranging type to make written language legible, readable, and appealing when displayed. The arrangement of type involves selecting typefaces, point sizes, line lengths, line-spacing, and letter-spacing.",
  "The term typography is also applied to the style, arrangement, and appearance of the letters, numbers, and symbols created by the process. Type design is a closely related craft, sometimes considered part of typography.",
  "For readers with dyslexia, specific typographic adjustments can significantly improve reading speed and comprehension. Larger font sizes, increased spacing between lines, and the use of sans-serif typefaces reduce the visual crowding that causes letters to blur or merge together.",
  "By tracking where the eyes are focused, reading interfaces can dynamically adapt. A focus ruler can highlight the current sentence, guiding the eye horizontally and preventing the reader from skipping lines or losing their place in dense blocks of text."
];

const mapRange = (val, inMin, inMax, outMin, outMax) => {
  return ((val - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

const clamp = (val, min, max) => {
  return Math.max(min, Math.min(max, val));
};

const THEMES = {
  neuroRead: {
    bg: "#111514", // Main background: Very dark green-black
    secBg: "#171D1B", // Secondary background: Dark charcoal-green
    cardBg: "#1C2421", // Card background: Slightly lighter dark
    accent: "#3E6259", // Primary accent: Muted emerald green
    brightAccent: "#6FAF8F", // Bright accent: Fresh green
    highlight: "#A8D5BA", // Highlight / glow: Soft mint green
    text: "#F2F0E8", // Main text: Warm off-white
    secText: "#A7B0AA", // Secondary text: Muted gray-green
    border: "#303936", // Borders: Subtle gray-green
    warning: "#F2C14E", // Warning / attention: Warm amber
    name: "🌿 NeuroRead Emerald (Default)"
  },
  light: { bg: "#fafafa", text: "#222222", cardBg: "#ffffff", border: "#e0e0e0", accent: "#3E6259", brightAccent: "#6FAF8F", highlight: "#A8D5BA", secText: "#666666", warning: "#F2C14E", name: "Standard (Light)" },
  sepia: { bg: "#f4ecd8", text: "#5c4033", cardBg: "#ebdcb9", border: "#cbb389", accent: "#3E6259", brightAccent: "#6FAF8F", highlight: "#A8D5BA", secText: "#8b6f5d", warning: "#F2C14E", name: "Sepia (Low Glare)" },
  mint: { bg: "#e2f0d9", text: "#1b382b", cardBg: "#d3e8c7", border: "#a8d495", accent: "#3E6259", brightAccent: "#6FAF8F", highlight: "#A8D5BA", secText: "#436854", warning: "#F2C14E", name: "Irlen Mint (Calming)" },
  blue: { bg: "#d4f1f9", text: "#0f2d4a", cardBg: "#c0e8f5", border: "#8ecee6", accent: "#3E6259", brightAccent: "#6FAF8F", highlight: "#A8D5BA", secText: "#3b698c", warning: "#F2C14E", name: "Irlen Soft Blue (Cool)" },
  rose: { bg: "#fce4ec", text: "#4a1525", cardBg: "#f8d0de", border: "#e6a3b8", accent: "#3E6259", brightAccent: "#6FAF8F", highlight: "#A8D5BA", secText: "#8a455a", warning: "#F2C14E", name: "Irlen Soft Rose (Warm)" },
  dark: { bg: "#121212", text: "#e0e0e0", cardBg: "#1e1e1e", border: "#333333", accent: "#6FAF8F", brightAccent: "#6FAF8F", highlight: "#A8D5BA", secText: "#888888", warning: "#F2C14E", name: "Dark Mode" },
  contrast: { bg: "#000000", text: "#ffff00", cardBg: "#111111", border: "#ffff00", accent: "#ffff00", brightAccent: "#ffff00", highlight: "#ffff00", secText: "#ffff88", warning: "#F2C14E", name: "High Contrast" }
};

export default function Home() {
  // PDF Parsing, Text & Pagination State
  const [passages, setPassages] = useState(INITIAL_PASSAGES);
  const [docTitle, setDocTitle] = useState("The History of Typography");
  const [isParsing, setIsParsing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const ITEMS_PER_PAGE = 15;

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
  const [fontFamily, setFontFamily] = useState("sans-serif");
  const [activeTheme, setActiveTheme] = useState("neuroRead");
  const [focusRulerEnabled, setFocusRulerEnabled] = useState(true);
  const [showEyeCursor, setShowEyeCursor] = useState(false);
  const [bionicMode, setBionicMode] = useState("auto");

  const { feed, signals, registerLineRefs } = useReadingBehavior();

  const gazeDataRef = useRef(null);
  const lastRenderRef = useRef(0);

  const handleGazeUpdate = useCallback((data) => {
    gazeDataRef.current = data;
    // Throttled UI state update to protect performance on long documents
    const now = Date.now();
    if (now - lastRenderRef.current > 66) {
      setGazeData(data);
      lastRenderRef.current = now;
    }
  }, []);

  // SAFE CDN-BASED PDF UPLOAD LOGIC
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== "application/pdf") return;

    setIsParsing(true);
    setDocTitle(file.name.replace(".pdf", ""));
    
    try {
      if (!window.pdfjsLib) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      }

      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);

      const loadingTask = window.pdfjsLib.getDocument({ data: typedArray });
      const pdf = await loadingTask.promise;
      let newPassages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        if (!textContent.items || textContent.items.length === 0) continue;

        const pageText = textContent.items.map((item) => item.str).join(" ");
        const sentences = pageText.match(/[^.!?]+[.!?]+/g) || [pageText];
        
        sentences.forEach(sentence => {
          const clean = sentence.replace(/\s+/g, " ").trim();
          if (clean.length > 10) newPassages.push(clean);
        });
      }

      if (newPassages.length === 0) {
        alert("No readable text found! If this is a scanned PDF, the app cannot read it because it is essentially an image.");
        setPassages(["No readable text found. Upload a standard text-based PDF."]);
      } else {
        setPassages(newPassages);
        setCurrentPage(0);
      }
    } catch (error) {
      console.error("PDF Parsing Error:", error);
      alert(`Could not read PDF: ${error.message}`);
    }
    
    setIsParsing(false);
    event.target.value = '';
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.code === "Space" || e.key === " " || e.keyCode === 32) && calibState === "calibrating") {
        e.preventDefault();
        
        const currentGaze = gazeDataRef.current || gazeData;
        if (!currentGaze) return;

        const currentPoint = {
          x: 1 - parseFloat(currentGaze.x),
          y: parseFloat(currentGaze.y)
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
  // SMART LINE-SNAPPING FIX FOR FOCUS RULER
  useEffect(() => {
    if (signals.currentLineIndex !== null && signals.currentLineIndex !== undefined) {
      const lineEl = document.querySelector(`[data-line-index="${signals.currentLineIndex}"]`);
      if (lineEl) {
        const rect = lineEl.getBoundingClientRect();
        // Calculate the exact vertical center of the active paragraph in viewport percentage (vh)
        const lineCenterYVh = ((rect.top + rect.height / 2) / window.innerHeight) * 100;
        targetYRef.current = clamp(lineCenterYVh, 5, 95);
      }
    }
  }, [signals.currentLineIndex]);

  const finishCalibration = (points) => {
    let xLeft = (points[0].x + points[3].x + points[6].x) / 3;
    let xRight = (points[2].x + points[5].x + points[8].x) / 3;
    
    let yTop = (points[0].y + points[1].y + points[2].y) / 3;
    let yBottom = (points[6].y + points[7].y + points[8].y) / 3;

    // Ensure yTop is upper bound and yBottom is lower bound
    if (yTop > yBottom) {
      const temp = yTop;
      yTop = yBottom;
      yBottom = temp;
    }

    if (xLeft > xRight) {
      const temp = xLeft;
      xLeft = xRight;
      xRight = temp;
    }

    // Auto-normalize & guarantee minimum non-zero span so calibration NEVER fails
    if (Math.abs(yBottom - yTop) < 0.01) {
      const yCenter = (yTop + yBottom) / 2;
      yTop = yCenter - 0.10;
      yBottom = yCenter + 0.10;
    }

    if (Math.abs(xRight - xLeft) < 0.01) {
      const xCenter = (xLeft + xRight) / 2;
      xLeft = xCenter - 0.15;
      xRight = xCenter + 0.15;
    }

    setBounds({
      xLeft,
      xRight,
      yTop,
      yBottom
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

    if (calibState === "done" && bounds) {
      const rawCursorX = mapRange(rawX, bounds.xLeft, bounds.xRight, 10, 90);
      const rawCursorY = mapRange(rawY, bounds.yTop, bounds.yBottom, 10, 90);

      cX = clamp(rawCursorX, 2, 98);
      cY = clamp(rawCursorY, 5, 95);
    } else {
      // Uncalibrated auto-scaling for MediaPipe camera iris Y range (~0.20..0.60)
      const rawCursorX = clamp(rawX * 100, 2, 98);
      const rawCursorY = mapRange(rawY, 0.20, 0.60, 10, 90);

      cX = rawCursorX;
      cY = clamp(rawCursorY, 5, 95);
    }

    setCursor({ x: cX, y: cY });
    targetYRef.current = cY;

    // Feed pixel gaze sample into reading behavior classifier
    if (typeof window !== "undefined") {
      feed({
        x: (cX / 100) * window.innerWidth,
        y: (cY / 100) * window.innerHeight,
        t: Date.now()
      });
    }
  }, [gazeData, calibState, bounds, calibError, feed]);

  // AUTOMATED NEURO-ADAPTIVE UI REACTIONS
  useEffect(() => {
    // Reaction 1: Saccadic Drift / Line Regressions -> Expand line height and letter spacing to relieve visual crowding
    if (signals.regressionCount >= 2) {
      setLineHeight("2.8");
      setLetterSpacing("1.5px");
    }
  }, [signals.regressionCount]);

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
    <main style={{ minHeight: "100vh", position: "relative", fontFamily: fontFamily, backgroundColor: currentTheme.bg, color: currentTheme.text, transition: "background-color 0.3s, color 0.3s" }}>
      
      {/* EXTRACTED TOOLBAR COMPONENT */}
      <Toolbar 
        calibState={calibState}
        calibError={calibError}
        onStartCalibration={() => { setCalibState("calibrating"); setCalibError(false); }}
        onRecalibrate={() => { setCalibState("idle"); setCalibIndex(0); setRawPoints([]); }}
        activeTheme={activeTheme}
        setActiveTheme={setActiveTheme}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        letterSpacing={letterSpacing}
        setLetterSpacing={setLetterSpacing}
        focusRulerEnabled={focusRulerEnabled}
        setFocusRulerEnabled={setFocusRulerEnabled}
        showEyeCursor={showEyeCursor}
        setShowEyeCursor={setShowEyeCursor}
        bionicMode={bionicMode}
        setBionicMode={setBionicMode}
        behaviorSignals={signals}
        themes={THEMES}
      />

      <div style={{ position: "fixed", top: "15px", right: "15px", zIndex: 1000 }}>
        <GazeTracker onGazeUpdate={handleGazeUpdate} />
      </div>

      {/* READING PASSAGE CARD */}
      <div style={{
        maxWidth: "850px",
        margin: "50px auto",
        padding: "40px 45px",
        backgroundColor: currentTheme.cardBg || "transparent",
        border: `1px solid ${currentTheme.border || "transparent"}`,
        borderRadius: "16px",
        boxShadow: currentTheme.cardBg ? "0 8px 32px rgba(0,0,0,0.3)" : "none",
        transition: "all 0.3s ease"
      }}>
        
        {/* TITLE & PDF UPLOAD BUTTON */}
        <div style={{ marginBottom: "30px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "20px" }}>
          <h2 style={{ fontSize: "2rem", margin: 0, color: currentTheme.brightAccent || currentTheme.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {docTitle}
          </h2>
          <label style={{
            padding: "10px 20px",
            backgroundColor: currentTheme.accent,
            color: currentTheme.bg,
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "bold",
            fontSize: "14px",
            boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            flexShrink: 0
          }}>
            {isParsing ? "Reading PDF..." : "📄 Upload PDF"}
            <input 
              type="file" 
              accept="application/pdf" 
              onChange={handleFileUpload} 
              style={{ display: "none" }} 
            />
          </label>
        </div>
        
        {/* PAGINATED TEXT PASSAGES CONTAINER */}
        <div style={{ 
          fontSize: fontSize, 
          lineHeight: lineHeight, 
          letterSpacing: letterSpacing,
          transition: "font-size 0.2s, line-height 0.2s, letter-spacing 0.2s" 
        }}>
          {passages
            .slice(currentPage * ITEMS_PER_PAGE, (currentPage + 1) * ITEMS_PER_PAGE)
            .map((text, idx) => {
              const absoluteIdx = currentPage * ITEMS_PER_PAGE + idx;
              const isBionicActive =
                bionicMode === "on" ||
                (bionicMode === "auto" && signals.dwellMs > 350 && signals.currentLineIndex === absoluteIdx);

              return (
                <p
                  key={absoluteIdx}
                  ref={registerLineRefs(absoluteIdx)}
                  data-line-index={absoluteIdx}
                  style={{
                    marginBottom: "25px",
                    padding: "8px 14px",
                    borderRadius: "8px",
                    backgroundColor:
                      signals.currentLineIndex === absoluteIdx
                        ? (currentTheme.highlight ? `${currentTheme.highlight}20` : "rgba(255, 235, 59, 0.12)")
                        : "transparent",
                    borderLeft: signals.currentLineIndex === absoluteIdx
                      ? `4px solid ${currentTheme.brightAccent || "#6FAF8F"}`
                      : "4px solid transparent",
                    transition: "background-color 0.3s, border-left 0.3s"
                  }}
                >
                  {isBionicActive ? parseBionic(text) : text}
                </p>
              );
            })}
        </div>

        {/* PAGINATION CONTROLS */}
        {passages.length > ITEMS_PER_PAGE && (
          <div style={{ 
            display: "flex", 
            justifyContent: "space-between", 
            alignItems: "center",
            marginTop: "40px",
            paddingTop: "20px",
            borderTop: `1px solid ${currentTheme.border || "transparent"}`
          }}>
            <button 
              onClick={() => {
                setCurrentPage(p => Math.max(0, p - 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === 0}
              style={{
                padding: "8px 16px", borderRadius: "6px", border: "none", cursor: currentPage === 0 ? "default" : "pointer",
                backgroundColor: currentPage === 0 ? "transparent" : currentTheme.accent,
                color: currentPage === 0 ? currentTheme.secText : currentTheme.bg,
                opacity: currentPage === 0 ? 0.4 : 1,
                fontWeight: "bold"
              }}
            >
              ← Previous Page
            </button>
            
            <span style={{ fontSize: "14px", color: currentTheme.secText }}>
              Page {currentPage + 1} of {Math.ceil(passages.length / ITEMS_PER_PAGE)}
            </span>
            
            <button 
              onClick={() => {
                setCurrentPage(p => Math.min(Math.ceil(passages.length / ITEMS_PER_PAGE) - 1, p + 1));
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              disabled={currentPage === Math.ceil(passages.length / ITEMS_PER_PAGE) - 1}
              style={{
                padding: "8px 16px", borderRadius: "6px", border: "none", cursor: currentPage === Math.ceil(passages.length / ITEMS_PER_PAGE) - 1 ? "default" : "pointer",
                backgroundColor: currentPage === Math.ceil(passages.length / ITEMS_PER_PAGE) - 1 ? "transparent" : currentTheme.accent,
                color: currentPage === Math.ceil(passages.length / ITEMS_PER_PAGE) - 1 ? currentTheme.secText : currentTheme.bg,
                opacity: currentPage === Math.ceil(passages.length / ITEMS_PER_PAGE) - 1 ? 0.4 : 1,
                fontWeight: "bold"
              }}
            >
              Next Page →
            </button>
          </div>
        )}
      </div>

      {/* FOCUS RULER */}
      {gazeData && calibState !== "calibrating" && focusRulerEnabled && (
        <div
          style={{
            position: "fixed",
            left: 0,
            top: `${rulerY}vh`,
            width: "100vw",
            height: "90px", 
            backgroundColor: currentTheme.highlight ? `${currentTheme.highlight}33` : "rgba(168, 213, 186, 0.25)", 
            borderTop: `2px solid ${currentTheme.brightAccent || "#6FAF8F"}`,
            borderBottom: `2px solid ${currentTheme.brightAccent || "#6FAF8F"}`,
            boxShadow: `0 0 20px ${currentTheme.highlight || "#A8D5BA"}60`,
            transform: "translateY(-50%)", 
            pointerEvents: "none",
            zIndex: 999,
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

      {/* EYE CURSOR (Hidden by default for ADHD focus mode) */}
      {gazeData && calibState !== "calibrating" && showEyeCursor && (
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
