import { useState, useRef, useEffect, useCallback } from 'react';
import { Video, VideoOff, Camera, RotateCcw, AlertCircle, Loader2 } from 'lucide-react';
import { Hands, Results, HAND_CONNECTIONS } from '@mediapipe/hands';
import { Camera as MpCamera } from '@mediapipe/camera_utils';
import { drawConnectors, drawLandmarks } from '@mediapipe/drawing_utils';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface SignInputProps {
  language: Language;
}

const translations = {
  en: {
    title: 'High-Accuracy Sign Recognition',
    startCamera: 'Start Camera',
    stopCamera: 'Stop Camera',
    switchCamera: 'Switch Camera',
    noCamera: 'No camera detected',
    cameraError: 'Error accessing camera',
    permissionDenied: 'Camera permission denied',
    analyzing: 'Tracking hand landmarks...',
    detected: 'Detected signs',
    uncertain: 'Uncertain sign',
  },
};

export function SignInput({ language }: SignInputProps) {
  const t = translations.en;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<MpCamera | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectedSigns, setDetectedSigns] = useState<string[]>([]);
  const [lastConfidence, setLastConfidence] = useState<number | null>(null);
  const [currentPrediction, setCurrentPrediction] = useState<string | null>(null);
  const [autoSpeak, setAutoSpeak] = useState(true);

  /* ================= MEDIAPIPE & PREDICTION ================= */

  const onResults = useCallback(async (results: Results) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvasCtx = canvasRef.current.getContext('2d');
    if (!canvasCtx) return;

    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    canvasCtx.drawImage(results.image, 0, 0, canvasRef.current.width, canvasRef.current.height);

    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // We want 126 floats (2 hands * 21 points * 3 coordinates)
      const combinedLandmarks = new Array(126).fill(0);

      results.multiHandLandmarks.forEach((landmarks, handIdx) => {
        if (handIdx >= 2) return;

        // Draw Landmarks
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF00', lineWidth: 5 });
        drawLandmarks(canvasCtx, landmarks, { color: '#FF0000', lineWidth: 2 });

        const startIdx = handIdx * 63;
        const wrist = landmarks[0];

        landmarks.forEach((lm, i) => {
          combinedLandmarks[startIdx + (i * 3)] = lm.x - wrist.x;
          combinedLandmarks[startIdx + (i * 3) + 1] = lm.y - wrist.y;
          combinedLandmarks[startIdx + (i * 3) + 2] = lm.z - wrist.z;
        });
      });

      // Send to Backend (FastAPI)
      try {
        const response = await fetch('http://localhost:5001/predict', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ landmarks: combinedLandmarks }),
        });

        if (response.ok) {
          const data = await response.json();
          setCurrentPrediction(data.prediction);
          setLastConfidence(data.confidence);
        }
      } catch (err) {
        console.error("Prediction fetch error:", err);
      }
    } else {
      setCurrentPrediction(null);
      setLastConfidence(null);
    }
    canvasCtx.restore();
  }, [currentPrediction]);

  // Capture current stable prediction to history
  const captureCurrentSign = () => {
    if (currentPrediction && currentPrediction !== "Uncertain") {
      setDetectedSigns(prev => [...prev, currentPrediction]);
      if (autoSpeak) speak(currentPrediction);
    }
  };

  const initMediaPipe = async () => {
    setIsInitializing(true);
    try {
      const hands = new Hands({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
      });

      hands.setOptions({
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.7,
      });

      hands.onResults(onResults);
      handsRef.current = hands;

      if (videoRef.current) {
        const camera = new MpCamera(videoRef.current, {
          onFrame: async () => {
            if (handsRef.current && videoRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 1280,
          height: 720,
          facingMode: facingMode
        });
        cameraRef.current = camera;
        await camera.start();
      }
      setIsStreaming(true);
      setError(null);
    } catch (err: any) {
      console.error("MediaPipe Init Error:", err);
      setError("Failed to initialize tracking system.");
    } finally {
      setIsInitializing(false);
    }
  };

  const stopCamera = async () => {
    if (cameraRef.current) {
      await cameraRef.current.stop();
      cameraRef.current = null;
    }
    if (handsRef.current) {
      await handsRef.current.close();
      handsRef.current = null;
    }
    setIsStreaming(false);
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  /* ================= TTS ================= */

  const speak = (text: string) => {
    if (!text || !window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop current speech
    const utterance = new SpeechSynthesisUtterance(text);
    const langMap: Record<string, string> = {
      'en': 'en-US', 'es': 'es-ES', 'fr': 'fr-FR', 'de': 'de-DE', 'zh': 'zh-CN', 'ar': 'ar-SA', 'hi': 'hi-IN'
    };
    utterance.lang = langMap[language] || 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 md:p-6">
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100">
        <div className="p-6 md:p-8 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              {t.title}
            </h2>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <span className="text-sm font-medium">Auto-Speak</span>
              <input
                type="checkbox"
                checked={autoSpeak}
                onChange={(e) => setAutoSpeak(e.target.checked)}
                className="w-5 h-5 accent-emerald-400 cursor-pointer"
              />
            </div>
          </div>
        </div>

        <div className="p-6 md:p-8">
          {/* Main Feed Container */}
          <div className="relative aspect-video bg-gray-900 rounded-2xl shadow-inner overflow-hidden border-4 border-gray-100 mb-8 group">
            <video ref={videoRef} className="hidden" playsInline muted />
            <canvas ref={canvasRef} className="w-full h-full object-cover" width={1280} height={720} />

            {!isStreaming && !isInitializing && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-900/90 text-white backdrop-blur-sm">
                <div className="text-center">
                  <div className="relative mb-6">
                    <VideoOff className="w-20 h-20 mx-auto text-gray-500" />
                    <div className="absolute inset-0 animate-pulse bg-gray-500/10 rounded-full blur-2xl"></div>
                  </div>
                  <p className="text-xl font-medium text-gray-400 mb-6">{error ?? 'Camera system is offline'}</p>
                  <button
                    onClick={initMediaPipe}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-full font-bold shadow-lg transition-all hover:scale-105"
                  >
                    {t.startCamera}
                  </button>
                </div>
              </div>
            )}

            {isInitializing && (
              <div className="absolute inset-0 bg-indigo-900/80 flex items-center justify-center backdrop-blur-md">
                <div className="text-center text-white">
                  <Loader2 className="w-16 h-16 animate-spin mx-auto mb-4 text-emerald-400" />
                  <p className="text-xl font-bold tracking-widest uppercase animate-pulse">Initializing AI tracking</p>
                </div>
              </div>
            )}

            {isStreaming && (
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="bg-emerald-500/90 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 backdrop-blur-md shadow-lg border border-emerald-400/50">
                  <div className="w-2 h-2 bg-white rounded-full animate-ping"></div>
                  Live Tracking Active
                </div>
                {currentPrediction && (
                  <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md shadow-lg border ${currentPrediction === "Uncertain" ? "bg-amber-500/90 border-amber-400/50" : "bg-indigo-600/90 border-indigo-400/50"} text-white`}>
                    {currentPrediction === "Uncertain" ? t.uncertain : `Detected: ${currentPrediction}`}
                  </div>
                )}
              </div>
            )}

            {/* Real-time Result Overlay */}
            {isStreaming && currentPrediction && currentPrediction !== "Uncertain" && (
              <div className="absolute bottom-6 right-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="bg-white/95 backdrop-blur-md p-6 rounded-2xl shadow-2xl border border-indigo-100 flex flex-col items-center min-w-[140px]">
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-tighter mb-1">Confidence</span>
                  <span className="text-4xl font-black text-indigo-600">{Math.round((lastConfidence || 0) * 100)}%</span>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full mt-3 overflow-hidden">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-300"
                      style={{ width: `${(lastConfidence || 0) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Controls Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Camera className="w-5 h-5 text-indigo-600" />
                System Controls
              </h3>
              <div className="flex flex-wrap gap-3">
                {isStreaming ? (
                  <>
                    <button
                      onClick={stopCamera}
                      className="px-6 py-3 bg-red-50 text-red-600 hover:bg-red-100 rounded-2xl font-bold transition-all flex items-center gap-2 border border-red-100"
                    >
                      <VideoOff className="w-5 h-5" /> {t.stopCamera}
                    </button>
                    <button
                      onClick={captureCurrentSign}
                      disabled={!currentPrediction || currentPrediction === "Uncertain"}
                      className="flex-1 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-2 hover:scale-[1.02]"
                    >
                      <AlertCircle className="w-5 h-5" /> Capture Stable Sign
                    </button>
                  </>
                ) : (
                  <button
                    onClick={initMediaPipe}
                    disabled={isInitializing}
                    className="w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-bold shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-2"
                  >
                    <Video className="w-6 h-6" /> {t.startCamera}
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-emerald-600" />
                  {t.detected}
                </h3>
                {detectedSigns.length > 0 && (
                  <button
                    onClick={() => setDetectedSigns([])}
                    className="text-xs font-bold text-indigo-500 hover:text-indigo-700 uppercase tracking-widest"
                  >
                    Reset History
                  </button>
                )}
              </div>
              <div className="min-h-[100px] bg-gray-50 rounded-2xl p-4 border border-dashed border-gray-200 flex flex-wrap gap-2 content-start">
                {detectedSigns.length === 0 ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 opacity-50">
                    <Loader2 className="w-8 h-8 mb-2" />
                    <span className="text-sm font-medium">No signs captured yet</span>
                  </div>
                ) : (
                  detectedSigns.map((sign, i) => (
                    <button
                      key={i}
                      onClick={() => speak(sign)}
                      className="px-4 py-2 bg-white border border-indigo-100 rounded-xl shadow-sm text-indigo-700 font-bold hover:shadow-md hover:border-indigo-300 transition-all animate-in zoom-in-50 duration-300"
                    >
                      {sign}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
