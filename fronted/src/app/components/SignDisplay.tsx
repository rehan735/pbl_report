
import { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react';

interface SignDisplayProps {
    text: string;
    className?: string;
    autoPlay?: boolean;
    speed?: number; // ms per character
}

export function SignDisplay({
    text,
    className = '',
    autoPlay = true,
    speed = 1000
}: SignDisplayProps) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [displayChars, setDisplayChars] = useState<string[]>([]);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // Parse text into displayable characters (letters, numbers, space)
    useEffect(() => {
        if (!text) {
            setDisplayChars([]);
            setCurrentIndex(0);
            return;
        }

        const cleanText = text.toLowerCase().replace(/[^a-z0-9 ]/g, '');
        const chars = cleanText.split('');
        setDisplayChars(chars);
        setCurrentIndex(0);
        setIsPlaying(autoPlay);
    }, [text, autoPlay]);

    // Handle playback loop
    useEffect(() => {
        if (isPlaying && displayChars.length > 0) {
            if (timerRef.current) clearTimeout(timerRef.current);

            timerRef.current = setTimeout(() => {
                setCurrentIndex((prev) => {
                    if (prev >= displayChars.length - 1) {
                        setIsPlaying(false); // Stop at the end
                        return prev;
                    }
                    return prev + 1;
                });
            }, speed);
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isPlaying, currentIndex, displayChars, speed]);

    const handlePlayPause = () => {
        if (currentIndex >= displayChars.length - 1) {
            setCurrentIndex(0); // Restart if at end
            setIsPlaying(true);
        } else {
            setIsPlaying(!isPlaying);
        }
    };

    const handleReset = () => {
        setCurrentIndex(0);
        setIsPlaying(false);
    };

    const handleNext = () => {
        setCurrentIndex((prev) => Math.min(prev + 1, displayChars.length - 1));
        setIsPlaying(false);
    };

    const handlePrev = () => {
        setCurrentIndex((prev) => Math.max(prev - 1, 0));
        setIsPlaying(false);
    };

    // Helper to get image URL for a character
    // Using a placeholder service or a public GitHub raw URL for ASL assets would be ideal.
    // For now, using a placeholder with the letter.
    const getSignImage = (char: string) => {
        if (char === ' ') return 'https://placehold.co/300x300?text=SPACE';
        // Example: https://raw.githubusercontent.com/generic/asl-repo/main/${char}.png
        // fallback to placeholder
        return `https://placehold.co/300x300/4f46e5/ffffff?text=${char.toUpperCase()}`;
    };

    if (!text || displayChars.length === 0) {
        return null;
    }

    const currentChar = displayChars[currentIndex];
    // Calculate progress percentage
    const progress = displayChars.length > 0 ? ((currentIndex + 1) / displayChars.length) * 100 : 0;

    return (
        <div className={`flex flex-col items-center bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden ${className}`}>

            {/* Sign Visual Display */}
            <div className="relative w-full aspect-square bg-gray-50 flex items-center justify-center border-b border-gray-200">
                <img
                    key={currentIndex} // Force re-render on change
                    src={getSignImage(currentChar)}
                    alt={`Sign for ${currentChar}`}
                    className="w-full h-full object-contain p-4 transition-opacity duration-300"
                />

                {/* Current Character Overlay */}
                <div className="absolute bottom-4 right-4 bg-black/70 text-white px-4 py-2 rounded-full text-2xl font-bold shadow-lg backdrop-blur-sm">
                    {currentChar === ' ' ? 'SPACE' : currentChar.toUpperCase()}
                </div>

                {/* Counter Overlay */}
                <div className="absolute top-4 left-4 bg-white/90 px-3 py-1 rounded-full text-sm text-gray-600 font-mono shadow-sm border border-gray-200">
                    {currentIndex + 1} / {displayChars.length}
                </div>
            </div>

            {/* Controls & Progress */}
            <div className="w-full p-4 space-y-4">

                {/* Progress Bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-indigo-600 transition-all duration-300 ease-out"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>

                {/* Control Buttons */}
                <div className="flex justify-between items-center px-2">
                    <button
                        onClick={handleReset}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
                        title="Restart"
                    >
                        <RotateCcw className="w-5 h-5" />
                    </button>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handlePrev}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                            disabled={currentIndex === 0}
                        >
                            <SkipBack className="w-6 h-6" />
                        </button>

                        <button
                            onClick={handlePlayPause}
                            className="p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-700 shadow-lg hover:shadow-indigo-200 transition-transform active:scale-95 mx-2"
                        >
                            {isPlaying ? <Pause className="fill-current w-6 h-6" /> : <Play className="fill-current w-6 h-6 ml-1" />}
                        </button>

                        <button
                            onClick={handleNext}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-full"
                            disabled={currentIndex === displayChars.length - 1}
                        >
                            <SkipForward className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="w-9"></div> {/* Spacer for alignment */}
                </div>
            </div>

            {/* Current Word Preview */}
            <div className="hidden md:flex flex-wrap justify-center gap-1 p-3 bg-gray-50 w-full border-t border-gray-100 max-h-24 overflow-y-auto">
                {displayChars.map((char, idx) => (
                    <span
                        key={idx}
                        onClick={() => { setCurrentIndex(idx); setIsPlaying(false); }}
                        className={`
                w-6 h-8 flex items-center justify-center rounded cursor-pointer text-sm font-bold transition-all border
                ${idx === currentIndex
                                ? 'bg-indigo-600 text-white border-indigo-600 scale-110 shadow-md'
                                : 'bg-white text-gray-500 border-gray-200 hover:bg-gray-100'}
             `}
                    >
                        {char.toUpperCase()}
                    </span>
                ))}
            </div>
        </div>
    );
}
