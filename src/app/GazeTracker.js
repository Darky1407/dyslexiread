"use client";

import { useEffect, useRef, useState } from "react";

// --- GLOBAL HACK TO PREVENT NEXT.JS FALSE CRASH OVERLAY ---
if (typeof window !== "undefined") {
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;
  const originalConsoleInfo = console.info;
  const originalConsoleLog = console.log;

  const suppressTFLite = (args) => {
    return args.some(
      (arg) =>
        typeof arg === "string" &&
        (arg.includes("TensorFlow Lite") || arg.includes("XNNPACK"))
    );
  };

  console.error = (...args) => {
    if (suppressTFLite(args)) return;
    originalConsoleError.apply(console, args);
  };
  console.warn = (...args) => {
    if (suppressTFLite(args)) return;
    originalConsoleWarn.apply(console, args);
  };
  console.info = (...args) => {
    if (suppressTFLite(args)) return;
    originalConsoleInfo.apply(console, args);
  };
  console.log = (...args) => {
    if (suppressTFLite(args)) return;
    originalConsoleLog.apply(console, args);
  };
}
// -----------------------------------------------------------

export default function GazeTracker({ onGazeUpdate }) {
  const videoRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animationRef = useRef(null);
  const startedRef = useRef(false);
  const lastVideoTimeRef = useRef(-1); 
  
  // Smoothing variables
  const smoothedGazeRef = useRef({ x: 0, y: 0 });
  // Set to 0.2: A balance between the sluggish 0.15 and the hyperactive 0.4
  const smoothingFactor = 0.2; 

  const [status, setStatus] = useState("Starting...");
  const [gaze, setGaze] = useState(null);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    let stream = null;

    async function start() {
      try {
        setStatus("Loading MediaPipe...");
        const mediaPipe = await import("@mediapipe/tasks-vision");
        const FaceLandmarker = mediaPipe.FaceLandmarker;
        const FilesetResolver = mediaPipe.FilesetResolver;

        setStatus("Loading MediaPipe engine...");
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );

        setStatus("Loading face model...");
        landmarkerRef.current = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "/models/face_landmarker.task",
            delegate: "GPU",
          },
          runningMode: "VIDEO",
          numFaces: 1,
        });

        setStatus("Requesting camera...");
        if (!navigator.mediaDevices) {
          throw new Error("Camera API is unavailable. Use localhost or HTTPS.");
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480, facingMode: "user" },
          audio: false,
        });

        if (!videoRef.current) throw new Error("Video element was not found.");

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        setStatus("Active");
        detectGaze();
      } catch (error) {
        setStatus("ERROR - Check console");
        console.error("Gaze Tracking Initialization Error:", error);
      }
    }

    function detectGaze() {
      if (!videoRef.current || !landmarkerRef.current) return;

      if (
        videoRef.current.readyState >= 2 &&
        videoRef.current.currentTime !== lastVideoTimeRef.current
      ) {
        lastVideoTimeRef.current = videoRef.current.currentTime;

        try {
          const results = landmarkerRef.current.detectForVideo(
            videoRef.current,
            performance.now()
          );

          if (results && results.faceLandmarks && results.faceLandmarks.length > 0) {
            const landmarks = results.faceLandmarks[0];
            
            // Measure Eye Openness using eyelid landmarks
            const leftEyeTop = landmarks[159];
            const leftEyeBottom = landmarks[145];
            
            // Calculate vertical distance between eyelids
            const eyeOpenness = leftEyeBottom.y - leftEyeTop.y;

            // BLINK PROTECTION: If eyelids are too close together, ignore this frame!
            // The cursor will simply stay exactly where it was until you open your eyes.
            if (eyeOpenness < 0.008) {
              animationRef.current = requestAnimationFrame(detectGaze);
              return;
            }

            const leftIris = landmarks[468];
            const rightIris = landmarks[473];

            if (leftIris && rightIris) {
              const rawX = (leftIris.x + rightIris.x) / 2;
              const rawY = (leftIris.y + rightIris.y) / 2;

              if (smoothedGazeRef.current.x === 0) {
                smoothedGazeRef.current.x = rawX;
                smoothedGazeRef.current.y = rawY;
              } else {
                smoothedGazeRef.current.x = (rawX * smoothingFactor) + (smoothedGazeRef.current.x * (1 - smoothingFactor));
                smoothedGazeRef.current.y = (rawY * smoothingFactor) + (smoothedGazeRef.current.y * (1 - smoothingFactor));
              }

              const currentGaze = {
                x: smoothedGazeRef.current.x,
                y: smoothedGazeRef.current.y,
              };

              setGaze({
                x: currentGaze.x.toFixed(3),
                y: currentGaze.y.toFixed(3),
              });

              if (onGazeUpdate) {
                onGazeUpdate(currentGaze);
              }
            }
          }
        } catch (error) {
          console.error("Gaze detection error:", error);
        }
      }

      animationRef.current = requestAnimationFrame(detectGaze);
    }

    start();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (stream) stream.getTracks().forEach((track) => track.stop());
      if (landmarkerRef.current) landmarkerRef.current.close();
    };
  }, [onGazeUpdate]); 

  return (
    <div className="gaze-tracker" style={{ padding: "10px", background: "#f0f0f0", borderRadius: "8px", width: "fit-content" }}>
      <p style={{ margin: "0 0 10px 0", fontFamily: "sans-serif" }}>
        ● Gaze Tracking: <b>{status}</b>
      </p>
      {gaze && (
        <p style={{ margin: "0 0 10px 0", fontFamily: "monospace", fontSize: "14px" }}>
          Smoothed X: {gaze.x} | Y: {gaze.y}
        </p>
      )}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          width: "240px",
          borderRadius: "8px",
          transform: "scaleX(-1)", 
        }}
      />
    </div>
  );
}