import { useState, useEffect } from 'react';
import { Send, Trash2, Volume2, Copy, Check } from 'lucide-react';
import { text } from '@/app/services/api';
import { SignDisplay } from './SignDisplay';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface TextInputProps {
  language: Language;
}

interface Message {
  id: number;
  text: string;
  timestamp: Date;
}

const translations = {
  en: {
    title: 'Text Input',
    placeholder: 'Type your message here...',
    send: 'Send',
    clear: 'Clear All',
    readAloud: 'Read Aloud',
    copy: 'Copy',
    copied: 'Copied!',
    messages: 'Your Messages',
    noMessages: 'No messages yet. Start typing!',
    characters: 'characters',
  },
  es: {
    title: 'Entrada de Texto',
    placeholder: 'Escribe tu mensaje aquí...',
    send: 'Enviar',
    clear: 'Limpiar Todo',
    readAloud: 'Leer en Voz Alta',
    copy: 'Copiar',
    copied: '¡Copiado!',
    messages: 'Tus Mensajes',
    noMessages: '¡Aún no hay mensajes. Comienza a escribir!',
    characters: 'caracteres',
  },
  fr: {
    title: 'Saisie de Texte',
    placeholder: 'Tapez votre message ici...',
    send: 'Envoyer',
    clear: 'Tout Effacer',
    readAloud: 'Lire à Voix Haute',
    copy: 'Copier',
    copied: 'Copié!',
    messages: 'Vos Messages',
    noMessages: 'Pas encore de messages. Commencez à taper!',
    characters: 'caractères',
  },
  de: {
    title: 'Texteingabe',
    placeholder: 'Geben Sie hier Ihre Nachricht ein...',
    send: 'Senden',
    clear: 'Alles Löschen',
    readAloud: 'Vorlesen',
    copy: 'Kopieren',
    copied: 'Kopiert!',
    messages: 'Ihre Nachrichten',
    noMessages: 'Noch keine Nachrichten. Beginnen Sie zu tippen!',
    characters: 'Zeichen',
  },
  zh: {
    title: '文本输入',
    placeholder: '在此输入您的消息...',
    send: '发送',
    clear: '全部清除',
    readAloud: '朗读',
    copy: '复制',
    copied: '已复制！',
    messages: '您的消息',
    noMessages: '还没有消息。开始输入吧！',
    characters: '字符',
  },
  ar: {
    title: 'إدخال النص',
    placeholder: 'اكتب رسالتك هنا...',
    send: 'إرسال',
    clear: 'مسح الكل',
    readAloud: 'قراءة بصوت عالٍ',
    copy: 'نسخ',
    copied: 'تم النسخ!',
    messages: 'رسائلك',
    noMessages: 'لا توجد رسائل حتى الآن. ابدأ الكتابة!',
    characters: 'حروف',
  },
  hi: {
    title: 'पाठ इनपुट',
    placeholder: 'यहाँ अपना संदेश लिखें...',
    send: 'भेजें',
    clear: 'सब कुछ साफ़ करें',
    readAloud: 'आवाज़ से पढ़ें',
    copy: 'कॉपी करें',
    copied: 'कॉपी किया गया!',
    messages: 'आपके संदेश',
    noMessages: 'अभी तक कोई संदेश नहीं। लिखना शुरू करें!',
    characters: 'कैरेक्टर',
  },
};

export function TextInput({ language }: TextInputProps) {
  const [currentText, setCurrentText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const t = translations[language];

  const sendMessage = async () => {
    if (!currentText.trim()) return;

    try {
      // Optimistic update
      const newMessage: Message = {
        id: Date.now(),
        text: currentText,
        timestamp: new Date(),
      };
      setMessages([...messages, newMessage]);
      const tempText = currentText;
      setCurrentText('');

      // Save to backend
      await text.sendMessage(tempText, language);
    } catch (error) {
      console.error('Failed to save message:', error);
    }
  };

  // Load messages on mount
  useEffect(() => {
    const loadMessages = async () => {
      try {
        const response = await text.getMessages(20, 0);
        const backendMessages = response.data.messages.map((msg: any) => ({
          id: msg.id,
          text: msg.messageText,
          timestamp: new Date(msg.createdAt),
        }));
        setMessages(backendMessages.reverse());
      } catch (error) {
        console.error('Failed to load messages:', error);
      }
    };
    loadMessages();
  }, []);

  const clearAll = () => {
    setMessages([]);
    setCurrentText('');
  };

  const readAloud = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === 'zh' ? 'zh-CN' : language;
    window.speechSynthesis.speak(utterance);
  };

  const copyToClipboard = (text: string, id: number) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
        <h2 className="text-3xl mb-6 text-center text-gray-800">{t.title}</h2>

        {/* Text Input Area */}
        <div className="mb-2">
          <textarea
            value={currentText}
            onChange={(e) => setCurrentText(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t.placeholder}
            className="w-full p-4 border-2 border-gray-300 rounded-lg focus:border-purple-500 focus:outline-none resize-none transition-colors text-lg"
            rows={6}
            style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
          />
          <div className="flex justify-end mt-1">
            <span className="text-sm text-gray-500">
              {currentText.length} {t.characters}
            </span>
          </div>
        </div>

        {/* Live Sign Language Preview */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <p className="text-sm text-gray-700 font-semibold uppercase tracking-wider">Sign Language Preview</p>
          </div>
          <SignDisplay
            text={currentText || (messages.length > 0 ? messages[messages.length - 1].text : '')}
            autoPlay={false}
            className="bg-gray-50 border border-gray-200"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 justify-center mb-8">
          <button
            onClick={sendMessage}
            disabled={!currentText.trim()}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
            {t.send}
          </button>

          {currentText.trim() && (
            <button
              onClick={() => readAloud(currentText)}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Volume2 className="w-5 h-5" />
              {t.readAloud}
            </button>
          )}

          {messages.length > 0 && (
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors shadow-lg hover:shadow-xl"
            >
              <Trash2 className="w-5 h-5" />
              {t.clear}
            </button>
          )}
        </div>

        {/* Messages Display */}
        <div className="border-t-2 border-gray-200 pt-6">
          <h3 className="text-xl mb-4 text-gray-800">{t.messages}</h3>

          {messages.length === 0 ? (
            <div className="text-center text-gray-400 py-12">
              <p className="text-lg">{t.noMessages}</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className="p-4 bg-purple-50 rounded-lg border border-purple-200 hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start gap-4 mb-2">
                    <p
                      className="text-gray-800 flex-1 whitespace-pre-wrap text-lg leading-relaxed"
                      style={{ direction: language === 'ar' ? 'rtl' : 'ltr' }}
                    >
                      {message.text}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => readAloud(message.text)}
                        className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200 transition-colors"
                        title={t.readAloud}
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => copyToClipboard(message.text, message.id)}
                        className="p-2 bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition-colors"
                        title={t.copy}
                      >
                        {copiedId === message.id ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-500">
                    {message.timestamp.toLocaleTimeString(language, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}