import { useState, useRef, useEffect } from 'react';
import { Video, VideoOff, Camera, RotateCcw, AlertCircle } from 'lucide-react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface SignInputProps {
  language: Language;
}

const translations = {
  en: {
    title: 'Sign Language Input',
    startCamera: 'Start Camera',
    stopCamera: 'Stop Camera',
    captureSign: 'Capture Sign',
    switchCamera: 'Switch Camera',
    noCamera: 'No camera detected',
    cameraError: 'Error accessing camera',
    permissionDenied: 'Camera permission denied',
    permissionInstructions:
      'Please allow camera access in your browser settings and try again.',
    analyzing: 'Analyzing sign language...',
    detected: 'Detected signs',
  },
};

export function SignInput({ language }: SignInputProps) {
  const t = translations.en;

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [detectedSigns, setDetectedSigns] = useState<string[]>([]);

  /* ================= CAMERA CONTROLS ================= */

  const startCamera = async () => {
    try {
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setIsStreaming(true);
    } catch (err: any) {
      console.error(err);
      if (err.name === 'NotAllowedError') {
        setError(t.permissionDenied);
      } else {
        setError(t.cameraError);
      }
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsStreaming(false);
  };

  const switchCamera = async () => {
    stopCamera();
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
    setTimeout(startCamera, 200);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  /* ================= REAL ML PREDICTION ================= */

  const captureSign = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    setIsAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Capture frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to image blob
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setIsAnalyzing(false);
        return;
      }

      const formData = new FormData();
      formData.append('image', blob, 'frame.jpg');

      try {
        const response = await fetch('http://localhost:5000/api/predict', {
          method: 'POST',
          body: formData,
        });

        const data: { prediction?: string } = await response.json();
        const prediction = data.prediction;

        if (prediction) {
          setDetectedSigns((prev) => [...prev, prediction]);
        }
      } catch (error) {
        console.error('Prediction failed:', error);
      }

      setIsAnalyzing(false);
    }, 'image/jpeg');
  };


  /* ================= VISUALIZATIONS & TTS ================= */

  const speak = (text: string) => {
    if (!text) return;
    const utterance = new SpeechSynthesisUtterance(text);
    // Rough mapping
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };
    utterance.lang = langMap[language] || language;
    window.speechSynthesis.speak(utterance);
  };

  const [autoSpeak, setAutoSpeak] = useState(true);

  // Auto-speak when a new sign is detected
  useEffect(() => {
    if (autoSpeak && detectedSigns.length > 0) {
      const lastSign = detectedSigns[detectedSigns.length - 1];
      speak(lastSign);
    }
  }, [detectedSigns, autoSpeak]);


  /* ================= UI ================= */

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl text-gray-800">
            {t.title}
          </h2>

          {/* Auto-Speak Toggle */}
          <label className="flex items-center gap-2 cursor-pointer bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors">
            <span className="text-sm font-medium text-gray-700">Auto-Speak</span>
            <input
              type="checkbox"
              checked={autoSpeak}
              onChange={(e) => setAutoSpeak(e.target.checked)}
              className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
            />
          </label>
        </div>

        {/* VIDEO */}
        <div className="relative bg-black rounded-xl overflow-hidden mb-6 aspect-video shadow-inner">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            playsInline
            muted
          />

          {!isStreaming && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-800 text-white">
              <div className="text-center">
                <VideoOff className="w-16 h-16 mx-auto mb-4 opacity-60" />
                <p>{error ?? 'Camera is off'}</p>
              </div>
            </div>
          )}

          {isAnalyzing && (
            <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
              <div className="text-white text-center">
                <div className="animate-spin h-14 w-14 border-4 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="font-medium text-lg tracking-wide">{t.analyzing}</p>
              </div>
            </div>
          )}
        </div>

        {/* CONTROLS */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          {!isStreaming ? (
            <button
              onClick={startCamera}
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl shadow-lg hover:bg-indigo-700 transition-all hover:scale-105 font-medium text-lg"
            >
              <Video className="w-6 h-6" />
              {t.startCamera}
            </button>
          ) : (
            <>
              <button
                onClick={stopCamera}
                className="flex items-center gap-2 px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
              >
                <VideoOff className="w-5 h-5" />
                {t.stopCamera}
              </button>

              <button
                onClick={captureSign}
                disabled={isAnalyzing}
                className="flex items-center gap-2 px-8 py-4 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all hover:scale-105 font-medium text-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Camera className="w-6 h-6" />
                {t.captureSign}
              </button>

              <button
                onClick={switchCamera}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
              >
                <RotateCcw className="w-5 h-5" />
                {t.switchCamera}
              </button>
            </>
          )}
        </div>

        {/* RESULTS */}
        {detectedSigns.length > 0 && (
          <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-indigo-900 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                {t.detected}
              </h3>
              <button
                onClick={() => setDetectedSigns([])}
                className="text-sm text-indigo-400 hover:text-indigo-600 underline"
              >
                Clear History
              </button>
            </div>

            <div className="flex flex-wrap gap-3">
              {detectedSigns.map((sign, i) => (
                <div key={i} className="group relative">
                  <button
                    onClick={() => speak(sign)}
                    className="px-5 py-3 bg-white border border-indigo-200 rounded-lg shadow-sm text-indigo-700 hover:shadow-md hover:border-indigo-300 transition-all text-lg font-medium"
                  >
                    {sign}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden canvas */}
        <canvas ref={canvasRef} className="hidden" />
      </div>
    </div>
  );
}
