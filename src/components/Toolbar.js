"use client";

export default function Toolbar({
  calibState,
  calibError,
  onStartCalibration,
  onRecalibrate,
  activeTheme,
  setActiveTheme,
  fontFamily,
  setFontFamily,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  letterSpacing,
  setLetterSpacing,
  focusRulerEnabled,
  setFocusRulerEnabled,
  showEyeCursor,
  setShowEyeCursor,
  bionicMode,
  setBionicMode,
  behaviorSignals,
  themes,
}) {
  const currentTheme = themes[activeTheme];

  return (
    <div
      style={{
        padding: "20px 40px",
        backgroundColor: currentTheme.bg,
        borderBottom: `1px solid ${currentTheme.text}22`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "15px",
        color: currentTheme.text,
      }}
    >
      <div>
        <h1 style={{ margin: "0 0 10px 0" }}>DyslexiRead</h1>
        {calibState === "idle" && (
          <button
            onClick={onStartCalibration}
            style={{
              padding: "8px 16px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            Calibrate Eye Tracker
          </button>
        )}
        {calibState === "done" && (
          <button
            onClick={onRecalibrate}
            style={{ padding: "8px 16px", cursor: "pointer" }}
          >
            Recalibrate
          </button>
        )}
        {calibError && (
          <span style={{ color: "red", marginLeft: "15px" }}>
            ⚠️ Calibration failed
          </span>
        )}
      </div>

      <div
        style={{
          display: "flex",
          gap: "15px",
          alignItems: "center",
          flexWrap: "wrap",
          background: `${currentTheme.text}11`,
          padding: "10px 15px",
          borderRadius: "8px",
        }}
      >
        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Theme:
          </label>
          <select
            value={activeTheme}
            onChange={(e) => setActiveTheme(e.target.value)}
            style={{ padding: "5px" }}
          >
            {Object.entries(themes).map(([key, t]) => (
              <option key={key} value={key}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Font Family:
          </label>
          <select
            value={fontFamily}
            onChange={(e) => setFontFamily(e.target.value)}
            style={{ padding: "5px", width: "120px" }}
          >
            <option value="sans-serif">System Sans</option>
            <option value="var(--font-geist-sans)">Geist Sans</option>
            <option value="'Comic Sans MS', 'Comic Sans', cursive">Comic Sans</option>
            <option value="Arial, sans-serif">Arial</option>
            <option value="Verdana, sans-serif">Verdana</option>
            <option value="'OpenDyslexic', sans-serif">OpenDyslexic</option>
          </select>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Font Size:
          </label>
          <select
            value={fontSize}
            onChange={(e) => setFontSize(e.target.value)}
            style={{ padding: "5px" }}
          >
            <option value="1rem">Standard</option>
            <option value="1.25rem">Large</option>
            <option value="1.5rem">Extra Large</option>
          </select>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Line Spacing:
          </label>
          <select
            value={lineHeight}
            onChange={(e) => setLineHeight(e.target.value)}
            style={{ padding: "5px" }}
          >
            <option value="1.8">Normal</option>
            <option value="2.3">Relaxed</option>
            <option value="2.8">Loose</option>
          </select>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Letter Spacing:
          </label>
          <select
            value={letterSpacing}
            onChange={(e) => setLetterSpacing(e.target.value)}
            style={{ padding: "5px" }}
          >
            <option value="normal">Normal</option>
            <option value="1.5px">Wide (+)</option>
            <option value="3px">Extra Wide (++)</option>
          </select>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Bionic Reading:
          </label>
          <select
            value={bionicMode}
            onChange={(e) => setBionicMode(e.target.value)}
            style={{ padding: "5px" }}
          >
            <option value="off">Off</option>
            <option value="on">On (Always)</option>
            <option value="auto">⚡ Auto (Fixation Triggered)</option>
          </select>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Focus Ruler:
          </label>
          <button
            onClick={() => setFocusRulerEnabled(!focusRulerEnabled)}
            style={{
              padding: "5px 10px",
              cursor: "pointer",
              background: focusRulerEnabled ? "#4CAF50" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {focusRulerEnabled ? "ON" : "OFF"}
          </button>
        </div>

        <div>
          <label
            style={{ fontSize: "12px", display: "block", marginBottom: "3px" }}
          >
            Eye Dot (Debug):
          </label>
          <button
            onClick={() => setShowEyeCursor(!showEyeCursor)}
            style={{
              padding: "5px 10px",
              cursor: "pointer",
              background: showEyeCursor ? "#2196F3" : "#ccc",
              color: "#fff",
              border: "none",
              borderRadius: "4px",
            }}
          >
            {showEyeCursor ? "VISIBLE" : "HIDDEN (ADHD)"}
          </button>
        </div>

        {behaviorSignals && (
          <div
            style={{
              fontSize: "11px",
              fontFamily: "monospace",
              background: "rgba(0,0,0,0.06)",
              padding: "4px 8px",
              borderRadius: "4px",
              display: "flex",
              gap: "8px",
            }}
          >
            <span>⏱️ Dwell: <b>{behaviorSignals.dwellMs}ms</b></span>
            <span>↩️ Regressions: <b>{behaviorSignals.regressionCount}</b></span>
            {behaviorSignals.fatigueFlag && (
              <span style={{ color: "#d32f2f", fontWeight: "bold" }}>⚠️ Strain Detected</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
