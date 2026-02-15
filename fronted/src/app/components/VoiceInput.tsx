import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Trash2, Volume2, Languages } from 'lucide-react';
import { voice, translate } from '@/app/services/api';
import { SignDisplay } from './SignDisplay';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface VoiceInputProps {
  language: Language;
}

const translations = {
  en: {
    title: 'Voice Input',
    startRecording: 'Start Recording',
    stopRecording: 'Stop Recording',
    listening: 'Listening...',
    transcript: 'Transcript',
    translation: 'Translation',
    clear: 'Clear',
    noSupport: 'Voice recognition not supported in this browser',
    speak: 'Click the microphone to start speaking',
    playback: 'Play Audio',
    targetLanguage: 'Target Language',
  },
  es: {
    title: 'Entrada de Voz',
    startRecording: 'Iniciar Grabación',
    stopRecording: 'Detener Grabación',
    listening: 'Escuchando...',
    transcript: 'Transcripción',
    translation: 'Traducción',
    clear: 'Limpiar',
    noSupport: 'Reconocimiento de voz no soportado en este navegador',
    speak: 'Haz clic en el micrófono para empezar a hablar',
    playback: 'Reproducir Audio',
    targetLanguage: 'Idioma de destino',
  },
  fr: {
    title: 'Saisie Vocale',
    startRecording: 'Démarrer Enregistrement',
    stopRecording: "Arrêter l'Enregistrement",
    listening: 'Écoute...',
    transcript: 'Transcription',
    translation: 'Traduction',
    clear: 'Effacer',
    noSupport: 'Reconnaissance vocale non supportée dans ce navigateur',
    speak: 'Cliquez sur le microphone pour commencer à parler',
    playback: 'Lire Audio',
    targetLanguage: 'Langue cible',
  },
  de: {
    title: 'Spracheingabe',
    startRecording: 'Aufnahme Starten',
    stopRecording: 'Aufnahme Stoppen',
    listening: 'Höre zu...',
    transcript: 'Transkript',
    translation: 'Übersetzung',
    clear: 'Löschen',
    noSupport: 'Spracherkennung in diesem Browser nicht unterstützt',
    speak: 'Klicken Sie auf das Mikrofon, um zu sprechen',
    playback: 'Audio Abspielen',
    targetLanguage: 'Zielsprache',
  },
  zh: {
    title: '语音输入',
    startRecording: '开始录音',
    stopRecording: '停止录音',
    listening: '正在听...',
    transcript: '转录',
    translation: '翻译',
    clear: '清除',
    noSupport: '此浏览器不支持语音识别',
    speak: '点击麦克风开始说话',
    playback: '播放音频',
    targetLanguage: '目标语言',
  },
  ar: {
    title: 'الإدخال الصوتي',
    startRecording: 'بدء التسجيل',
    stopRecording: 'إيقاف التسجيل',
    listening: 'الاستماع...',
    transcript: 'النص المكتوب',
    translation: 'الترجمة',
    clear: 'مسح',
    noSupport: 'التعرف على الصوت غير مدعوم في هذا المتصفح',
    speak: 'انقر على الميكروفون لبدء الحديث',
    playback: 'تشغيل الصوت',
    targetLanguage: 'اللغة المستهدفة',
  },
  hi: {
    title: 'वाचक इनपुट',
    startRecording: 'रिकॉर्डिंग शुरू करें',
    stopRecording: 'रिकॉर्डिंग स्थगित करें',
    listening: 'सुन रहा हूँ...',
    transcript: 'ट्रांसक्रिप्ट',
    translation: 'अनुवाद',
    clear: 'साफ़ करें',
    noSupport: 'इस ब्राउज़र में वाचक पहचान नहीं समर्थित है',
    speak: 'माइक्रोफोन पर क्लिक करके बातचीत शुरू करें',
    playback: 'ऑडियो प्ले करें',
    targetLanguage: 'लक्षित भाषा',
  },
};

const languagesList: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];

interface ISpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: ((this: ISpeechRecognition, ev: Event) => any) | null;
  onresult: ((this: ISpeechRecognition, ev: ISpeechRecognitionEvent) => any) | null;
  onerror: ((this: ISpeechRecognition, ev: any) => any) | null;
  onend: ((this: ISpeechRecognition, ev: Event) => any) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

export function VoiceInput({ language }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [translatedTranscript, setTranslatedTranscript] = useState('');
  const [targetLanguage, setTargetLanguage] = useState<Language>('es'); // Default target
  const [isSupported, setIsSupported] = useState(true);

  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  const t = translations[language];

  useEffect(() => {
    // Check if speech recognition is supported
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    const recognition = new SpeechRecognition() as ISpeechRecognition;
    recognition.continuous = true;
    recognition.interimResults = true;

    // Set language based on prop
    const langMap: Record<Language, string> = {
      en: 'en-US',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE',
      zh: 'zh-CN',
      ar: 'ar-SA',
      hi: 'hi-IN',
    };
    recognition.lang = langMap[language] || 'en-US';

    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
    };

    recognition.onresult = (event: ISpeechRecognitionEvent) => {
      let interim = '';
      let finalStr = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcriptPiece = result[0].transcript;
        if (result.isFinal) {
          finalStr += transcriptPiece + ' ';
        } else {
          interim += transcriptPiece;
        }
      }

      if (finalStr) {
        setTranscript((prev) => prev + finalStr);
        setInterimTranscript('');

        // Move side effects out of state updates
        const currentLang = language;
        const currentTargetLang = targetLanguage;

        voice.transcribe(finalStr, currentLang, 0)
          .catch(err => console.error('Failed to save transcript:', err));

        if (finalStr.trim()) {
          translate.text(finalStr, currentLang, currentTargetLang)
            .then(res => {
              if (res.data.success) {
                setTranslatedTranscript(prev => prev + res.data.translatedText + ' ');
              }
            })
            .catch(err => console.error('Translation failed:', err));
        }
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setIsSupported(false);
        setIsRecording(false);
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      // If we are still supposed to be recording, it means the browser timed out
      // but we shouldn't auto-restart here to avoid infinite loops if it's a permanent error
      // However, for continuous experience:
      if (recognitionRef.current && isRecording) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          setIsRecording(false);
        }
      } else {
        setIsRecording(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null; // Prevent restart on cleanup
          recognitionRef.current.stop();
        } catch (e) { }
      }
    };
  }, [language, targetLanguage]);

  const startRecording = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.start();
      setInterimTranscript('');
    } catch (e) {
      console.error('Error starting recognition:', e);
    }
  };

  const stopRecording = () => {
    if (!recognitionRef.current) return;
    try {
      recognitionRef.current.stop();
      setIsRecording(false);
    } catch (e) {
      console.error('Error stopping recognition:', e);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setInterimTranscript('');
    setTranslatedTranscript('');
  };

  const speakText = (textToSpeak: string, lang: string) => {
    if (!textToSpeak) return;

    const utterance = new SpeechSynthesisUtterance(textToSpeak);
    // Rough mapping for TTS
    const langMap: Record<string, string> = {
      'en': 'en-US',
      'es': 'es-ES',
      'fr': 'fr-FR',
      'de': 'de-DE',
      'zh': 'zh-CN',
      'ar': 'ar-SA',
      'hi': 'hi-IN'
    };
    utterance.lang = langMap[lang] || lang;
    window.speechSynthesis.speak(utterance);
  };

  if (!isSupported) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <h2 className="text-3xl mb-6 text-center text-gray-800">{t.title}</h2>
          <div className="text-center text-red-600 p-8 bg-red-50 rounded-lg">
            <MicOff className="w-16 h-16 mx-auto mb-4" />
            <p className="text-lg">{t.noSupport}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-3xl mb-6 text-center text-gray-800">{t.title}</h2>

        {/* Target Language Selector */}
        <div className="flex justify-center mb-8 items-center gap-4">
          <label className="text-gray-700 font-medium flex items-center gap-2">
            <Languages className="w-5 h-5 text-indigo-600" />
            {t.targetLanguage}:
          </label>
          <select
            value={targetLanguage}
            onChange={(e) => setTargetLanguage(e.target.value as Language)}
            className="p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            {languagesList.filter(l => l.code !== language).map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.name}
              </option>
            ))}
          </select>
        </div>

        {/* Microphone Visual */}
        <div className="flex justify-center mb-8">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl ${isRecording
              ? 'bg-red-500 hover:bg-red-600 animate-pulse'
              : 'bg-green-500 hover:bg-green-600'
              }`}
          >
            {isRecording ? (
              <MicOff className="w-16 h-16 text-white" />
            ) : (
              <Mic className="w-16 h-16 text-white" />
            )}

            {isRecording && (
              <div className="absolute inset-0 rounded-full border-4 border-red-400 animate-ping"></div>
            )}
          </button>
        </div>

        {/* Status */}
        <div className="text-center mb-6">
          {isRecording ? (
            <div className="flex items-center justify-center gap-2 text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <p className="text-xl">{t.listening}</p>
            </div>
          ) : (
            <p className="text-gray-500 text-lg">{t.speak}</p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-6">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className={`flex items-center gap-2 px-6 py-3 text-white rounded-lg transition-colors shadow-lg hover:shadow-xl ${isRecording
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-green-600 hover:bg-green-700'
              }`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-5 h-5" />
                {t.stopRecording}
              </>
            ) : (
              <>
                <Mic className="w-5 h-5" />
                {t.startRecording}
              </>
            )}
          </button>

          {(transcript || translatedTranscript) && (
            <button
              onClick={clearTranscript}
              className="flex items-center gap-2 px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Trash2 className="w-5 h-5" />
              {t.clear}
            </button>
          )}
        </div>

        {/* Transcripts Display */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          {/* Original Transcript */}
          <div className="p-6 bg-gray-50 rounded-lg border border-gray-200 min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg text-gray-800 font-semibold">{t.transcript}</h3>
              {transcript && (
                <button
                  onClick={() => speakText(transcript, language)}
                  className="p-2 text-blue-600 hover:bg-blue-100 rounded-full transition-colors"
                  title={t.playback}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap flex-grow mb-4">
              {transcript}
              {interimTranscript && (
                <span className="text-gray-400 italic">{interimTranscript}</span>
              )}
              {!transcript && !interimTranscript && (
                <span className="text-gray-400 italic text-sm">...</span>
              )}
            </div>

            {/* Live Sign Display for Original Text */}
            {transcript && (
              <div className="mt-auto">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wider">Sign Language Preview</p>
                <SignDisplay text={interimTranscript || transcript.split(' ').slice(-3).join(' ')} autoPlay={true} className="border-t border-gray-200 pt-4" />
              </div>
            )}
          </div>

          {/* Translated Transcript */}
          <div className="p-6 bg-indigo-50 rounded-lg border border-indigo-200 min-h-[200px] flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg text-indigo-900 font-semibold flex items-center gap-2">
                {t.translation}
                <span className="text-xs font-normal bg-indigo-200 px-2 py-1 rounded text-indigo-800">
                  {languagesList.find(l => l.code === targetLanguage)?.name}
                </span>
              </h3>
              {translatedTranscript && (
                <button
                  onClick={() => speakText(translatedTranscript, targetLanguage)}
                  className="p-2 text-indigo-600 hover:bg-indigo-100 rounded-full transition-colors"
                  title={t.playback}
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>
            <div className="text-gray-800 text-lg leading-relaxed whitespace-pre-wrap flex-grow">
              {translatedTranscript || (
                <span className="text-indigo-300 italic text-sm">...</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}