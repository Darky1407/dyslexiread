DyslexiRead
DyslexiRead is a smart reading interface that adapts text in real time to make reading easier for people with Dyslexia and ADHD. It was developed by Team NoSleep for the Open Innovation - Accessibility track. 

Overview
People with Dyslexia and ADHD often struggle to maintain focus, track lines, and read comfortably during prolonged digital reading. Because static reading interfaces cannot adapt to these challenges in real time, they frequently cause frustration and fatigue. DyslexiRead solves this by monitoring reading behavior via a standard webcam and automatically adjusting text formatting, spacing, colors, and focus features. Furthermore, a paired smartphone provides gentle haptic feedback when changes in focus or fatigue are detected.
Core Features
Webcam-Based Gaze Tracking: Monitors reading behavior through a standard laptop webcam without requiring specialized eye-tracking hardware.
Real-Time Adaptive Reading: Automatically analyzes reading patterns (such as fixations, regressions, and gaze drift) to adjust the reading experience instantly.
Personalized Text Formatting: Dynamically applies focus rulers, reduced distractions, emphasis, and customized spacing and color adjustments.
Haptic Feedback: Pairs with a mobile Progressive Web App (PWA) to deliver gentle physical notifications when focus lapses.

Technology Stack
Frontend: React, Next.js, and Progressive Web Apps (PWA).Gaze Tracking & Computer Vision: WebGazer.js / MediaPipe for signal processing and behavior classification.
Backend & Real-Time Communication: Node.js, Express.js, and Socket.IO for cross-device laptop-to-phone communication.
