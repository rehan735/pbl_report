import { useState, useRef, useEffect, useCallback } from "react";
import { Video, VideoOff } from "lucide-react";
import { Hands, Results, HAND_CONNECTIONS } from "@mediapipe/hands";
import { Camera as MpCamera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface SignInputProps {
  language: Language;
}
const translations = {
  en: {
    title: "Real-Time Sign Recognition",
    startCamera: "Start Camera",
    stop: "Stop",
    prediction: "Prediction",
    confidence: "Confidence",
    bufferFullNotMoving: "[Buffer] Full but NOT moving. isMoving=",
    triggeringPrediction: "[Buffer] Triggering prediction. isMoving="
  },
  es: {
    title: "Reconocimiento de Señas en Tiempo Real",
    startCamera: "Iniciar Cámara",
    stop: "Detener",
    prediction: "Predicción",
    confidence: "Confianza",
    bufferFullNotMoving: "[Búfer] Lleno pero NO se mueve. isMoving=",
    triggeringPrediction: "[Búfer] Activando predicción. isMoving="
  },
  fr: {
    title: "Reconnaissance des Signes en Temps Réel",
    startCamera: "Démarrer la Caméra",
    stop: "Arrêter",
    prediction: "Prédiction",
    confidence: "Confiance",
    bufferFullNotMoving: "[Tampon] Plein mais NE bouge PAS. isMoving=",
    triggeringPrediction: "[Tampon] Déclenchement de la prédiction. isMoving="
  },
  de: {
    title: "Echtzeit-Gebärdenerkennung",
    startCamera: "Kamera Starten",
    stop: "Stoppen",
    prediction: "Vorhersage",
    confidence: "Konfidenz",
    bufferFullNotMoving: "[Puffer] Voll, aber KEINE Bewegung. isMoving=",
    triggeringPrediction: "[Puffer] Vorhersage wird ausgelöst. isMoving="
  },
  zh: {
    title: "实时手语识别",
    startCamera: "开启摄像头",
    stop: "停止",
    prediction: "预测结果",
    confidence: "置信度",
    bufferFullNotMoving: "[缓冲区] 已满但未移动。isMoving=",
    triggeringPrediction: "[缓冲区] 触发预测。isMoving="
  },
  ar: {
    title: "التعرف على الإشارة في الوقت الحقيقي",
    startCamera: "بدء الكاميرا",
    stop: "إيقاف",
    prediction: "التوقع",
    confidence: "الثقة",
    bufferFullNotMoving: "[المخزن المؤقت] ممتلئ ولكن لا يتحرك. isMoving=",
    triggeringPrediction: "[المخزن المؤقت] تفعيل التوقع. isMoving="
  },
  hi: {
    title: "वास्तविक समय साइन पहचान",
    startCamera: "कैमरा शुरू करें",
    stop: "रोकें",
    prediction: "अनुमान",
    confidence: "आत्मविश्वास",
    bufferFullNotMoving: "[बफर] भरा हुआ है लेकिन हिल नहीं रहा है। isMoving=",
    triggeringPrediction: "[बफर] अनुमान शुरू किया जा रहा है। isMoving="
  }
};

export function SignInput({ language }: SignInputProps) {

  const t = translations[language];

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handsRef = useRef<Hands | null>(null);
  const cameraRef = useRef<MpCamera | null>(null);

  const frameBufferRef = useRef<number[][]>([]);
  const lastSendRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const predictingRef = useRef(false);

  const [isStreaming, setIsStreaming] = useState(false);
  const [prediction, setPrediction] = useState<string | null>(null);
  const [confidence, setConfidence] = useState<number | null>(null);

  /* ---------------- PREDICTION ---------------- */

  const predictAsync = async (frames: number[][]) => {

    if (predictingRef.current) return;
    predictingRef.current = true;

    try {
      const res = await fetch("http://localhost:5001/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frames })
      });

      console.log(`[Predict] Response status: ${res.status}`);

      if (res.ok) {
        const data = await res.json();
        console.log(`[Predict] Result: ${data.prediction} (${data.confidence})`);
        setPrediction(data.prediction);
        setConfidence(data.confidence);
      } else {
        console.error(`[Predict] Failed:`, await res.text());
      }

    } catch (e) {
      console.error("Prediction error", e);
    }

    predictingRef.current = false;
  };

  /* ---------------- MEDIAPIPE RESULTS ---------------- */

  const onResults = useCallback((results: Results) => {

    if (!canvasRef.current) return;

    const now = Date.now();

    // limit fps
    if (now - lastFrameTimeRef.current < 50) return;
    lastFrameTimeRef.current = now;

    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.save();
    ctx.clearRect(0, 0, 640, 480);
    ctx.drawImage(results.image, 0, 0, 640, 480);

    if (results.multiHandLandmarks) {

      const combined = new Array(126).fill(0);

      results.multiHandLandmarks.forEach((hand, handIdx) => {

        if (handIdx >= 2) return;

        drawConnectors(ctx, hand, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 3 });
        drawLandmarks(ctx, hand, { color: "#FF0000", lineWidth: 2 });

        const start = handIdx * 63;

        hand.forEach((lm, i) => {

          combined[start + i * 3] = lm.x;
          combined[start + i * 3 + 1] = lm.y;
          combined[start + i * 3 + 2] = lm.z;

        });

      });

      /* ---------- BUFFER ---------- */

      if (frameBufferRef.current.length === 30) {
        frameBufferRef.current.shift();
      }

      frameBufferRef.current.push(combined);

      /* ---------- MOTION DETECTION ---------- */

      let isMoving = false;

      if (frameBufferRef.current.length === 30) {

        const old = frameBufferRef.current[15];
        let diff = 0;

        for (let i = 0; i < combined.length; i++) {
          diff += Math.abs(combined[i] - old[i]);
        }

        isMoving = diff > 2.0;
      }

      /* ---------- SEND TO BACKEND ---------- */

      if (
        frameBufferRef.current.length === 30 &&
        isMoving &&
        now - lastSendRef.current > 500
      ) {
        console.log(`${t.triggeringPrediction}${isMoving}`);

        lastSendRef.current = now;
        predictAsync([...frameBufferRef.current]);

      } else if (frameBufferRef.current.length === 30 && (now - lastSendRef.current > 500)) {
        console.log(`${t.bufferFullNotMoving}${isMoving}`);
      }

    }

    ctx.restore();

  }, []);

  /* ---------------- INIT MEDIAPIPE ---------------- */

  const startCamera = async () => {

    if (!videoRef.current) return;

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 0,
      minDetectionConfidence: 0.6,
      minTrackingConfidence: 0.6
    });

    hands.onResults(onResults);

    handsRef.current = hands;

    const camera = new MpCamera(videoRef.current, {
      onFrame: async () => {
        if (handsRef.current && videoRef.current) {
          await handsRef.current.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480
    });

    cameraRef.current = camera;
    await camera.start();

    setIsStreaming(true);
  };

  /* ---------------- STOP CAMERA ---------------- */

  const stopCamera = async () => {

    if (cameraRef.current) {
      await cameraRef.current.stop();
      cameraRef.current = null;
    }

    if (handsRef.current) {
      await handsRef.current.close();
      handsRef.current = null;
    }

    frameBufferRef.current = [];
    setPrediction(null);
    setConfidence(null);

    setIsStreaming(false);
  };

  useEffect(() => {
    return () => { stopCamera(); };
  }, []);

  /* ---------------- UI ---------------- */

  return (

    <div className="w-full max-w-4xl mx-auto p-6">

      <div className="bg-white shadow-xl rounded-2xl p-6">

        <h2 className="text-2xl font-bold mb-4">
          {t.title}
        </h2>

        <div className="relative">

          <video
            ref={videoRef}
            className="hidden"
            playsInline
            muted
          />

          <canvas
            ref={canvasRef}
            width={640}
            height={480}
            className="rounded-xl border"
          />

          {!isStreaming && (

            <div className="absolute inset-0 flex items-center justify-center bg-black/70">

              <button
                onClick={startCamera}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl flex items-center gap-2">

                <Video size={20} />
                {t.startCamera}

              </button>

            </div>

          )}

        </div>

        {isStreaming && (

          <div className="mt-4 flex gap-4">

            <button
              onClick={stopCamera}
              className="bg-red-500 text-white px-4 py-2 rounded-xl flex items-center gap-2">

              <VideoOff size={18} />
              {t.stop}

            </button>

          </div>

        )}

        <div className="mt-6">

          {prediction && (

            <div className="bg-indigo-50 p-4 rounded-xl">

              <p className="text-lg font-semibold">
                {t.prediction}: {prediction}
              </p>

              {confidence && (
                <p className="text-sm text-gray-600">
                  {t.confidence}: {(confidence * 100).toFixed(1)}%
                </p>
              )}

            </div>

          )}

        </div>

      </div>

    </div>

  );
}