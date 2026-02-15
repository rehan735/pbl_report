import React, { useRef, useState } from "react";
import Webcam from "react-webcam";

const WebcamPredict: React.FC = () => {
    const webcamRef = useRef<Webcam | null>(null);
    const [prediction, setPrediction] = useState<string>("—");
    const [loading, setLoading] = useState<boolean>(false);
    const [isActive, setIsActive] = useState<boolean>(false);

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

            const data: { prediction?: string } = await res.json();
            setPrediction(data.prediction ?? "?");
        } catch (error) {
            console.error(error);
            // Don't set error on UI for continuous loop, just log it
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

            <h3 style={{ fontSize: "48px", marginTop: "20px" }}>
                {prediction}
            </h3>
        </div>
    );
};

export default WebcamPredict;
