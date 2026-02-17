import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const WebcamPredict: React.FC = () => {
    const webcamRef = useRef<Webcam | null>(null);
    const [prediction, setPrediction] = useState<string>("—");
    const [confidence, setConfidence] = useState<number | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [isActive, setIsActive] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Auto-capture effect
    React.useEffect(() => {
        let interval: any;
        if (isActive) {
            interval = setInterval(() => {
                if (!loading) {
                    captureAndPredict();
                }
            }, 500); // Predict every 500ms
        }
        return () => clearInterval(interval);
    }, [isActive, loading]);

    const captureAndPredict = async () => {
        if (!webcamRef.current) return;

        // Don't set loading state for continuous loop to avoid UI flicker, 
        // or keep it but ensure fast backend response.
        // We track internal 'processing' state to avoid overlap.
        if (loading) return;

        setLoading(true);

        const imageSrc = webcamRef.current.getScreenshot();
        if (!imageSrc) {
            setLoading(false);
            return;
        }

        // Convert base64 → Blob
        const blob = await fetch(imageSrc).then(res => res.blob());

        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");

        try {
            const res = await fetch("http://localhost:5000/api/predict", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                throw new Error(`Prediction failed: ${res.status} ${res.statusText}`);
            }

            const data: { prediction?: string; confidence?: number } = await res.json();
            setPrediction(data.prediction ?? "?");
            setConfidence(typeof data.confidence === "number" ? data.confidence : null);
            setError(null); // Clear any previous errors
        } catch (error: any) {
            console.error(error);
            // Only show error if not in continuous mode, or show briefly
            if (!isActive) {
                setError(error.message || "Failed to get prediction");
            }
        }

        setLoading(false);
    };

    return (
        <div style={{ textAlign: "center" }}>
            <h2>Live Sign Prediction</h2>

            <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                width={300}
                height={300}
                videoConstraints={{
                    width: 300,
                    height: 300,
                    facingMode: "user",
                }}
            />

            <br />
            <div style={{ marginTop: "20px" }}>
                <button
                    onClick={() => setIsActive(!isActive)}
                    style={{
                        padding: "10px 20px",
                        fontSize: "16px",
                        backgroundColor: isActive ? "#ff4444" : "#44ff44",
                        border: "none",
                        borderRadius: "5px",
                        cursor: "pointer"
                    }}
                >
                    {isActive ? "Stop Auto-Detect" : "Start Auto-Detect"}
                </button>
            </div>

            <div style={{ marginTop: "20px" }}>
                <h3 style={{ fontSize: "48px", marginBottom: "10px" }}>
                    {prediction}
                </h3>
                {confidence !== null && (
                    <p style={{ fontSize: "18px", color: "#555" }}>
                        Confidence: {(confidence * 100).toFixed(1)}%
                    </p>
                )}
                {error && (
                    <p style={{ fontSize: "14px", color: "#ff4444", marginTop: "10px" }}>
                        Error: {error}
                    </p>
                )}
            </div>
        </div>
    );
};

export default WebcamPredict;
