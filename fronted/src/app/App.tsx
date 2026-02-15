import { useState, useEffect, useRef } from 'react';
import { SignInput } from '@/app/components/SignInput';
import { VoiceInput } from '@/app/components/VoiceInput';
import { TextInput } from '@/app/components/TextInput';
import { Login } from '@/app/components/Login';
import { Register } from '@/app/components/Register';
import { Video, Mic, MessageSquare, Languages, LogOut, User } from 'lucide-react';
import { auth } from '@/app/services/api';

type InputMode = 'sign' | 'voice' | 'text' | null;
type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';
type AuthPage = 'login' | 'register' | null;

const languages: { code: Language; name: string }[] = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'zh', name: '中文' },
  { code: 'ar', name: 'العربية' },
  { code: 'hi', name: 'हिन्दी' },
];

interface User {
  name: string;
  email: string;
}

export default function App() {
  const [inputMode, setInputMode] = useState<InputMode>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [user, setUser] = useState<User | null>(null);
  const languageMenuRef = useRef<HTMLDivElement>(null);

  // Close language menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target as Node)) {
        setShowLanguageMenu(false);
      }
    };

    if (showLanguageMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageMenu]);

  const translations = {
    en: {
      title: 'Accessible Communication App',
      subtitle: 'Choose your preferred input method',
      signInput: 'Sign Input',
      voiceInput: 'Voice Input',
      textInput: 'Text Input',
      back: 'Back',
    },
    es: {
      title: 'Aplicación de Comunicación Accesible',
      subtitle: 'Elija su método de entrada preferido',
      signInput: 'Entrada de Señas',
      voiceInput: 'Entrada de Voz',
      textInput: 'Entrada de Texto',
      back: 'Volver',
    },
    fr: {
      title: 'Application de Communication Accessible',
      subtitle: 'Choisissez votre méthode de saisie préférée',
      signInput: 'Saisie par Signes',
      voiceInput: 'Saisie Vocale',
      textInput: 'Saisie de Texte',
      back: 'Retour',
    },
    de: {
      title: 'Zugängliche Kommunikations-App',
      subtitle: 'Wählen Sie Ihre bevorzugte Eingabemethode',
      signInput: 'Gebärdensprache',
      voiceInput: 'Spracheingabe',
      textInput: 'Texteingabe',
      back: 'Zurück',
    },
    zh: {
      title: '无障碍通信应用',
      subtitle: '选择您喜欢的输入方式',
      signInput: '手语输入',
      voiceInput: '语音输入',
      textInput: '文本输入',
      back: '返回',
    },
    ar: {
      title: 'تطبيق الاتصال الميسر',
      subtitle: 'اختر طريقة الإدخال المفضلة لديك',
      signInput: 'إدخال لغة الإشارة',
      voiceInput: 'إدخال صوتي',
      textInput: 'إدخال نصي',
      back: 'رجوع',
    },
    hi: {
      title: 'उपलब्धिक वाणिक संचालन अनुवादक',
      subtitle: 'अपनी पसंदीदा इनपुट विधि चुनें',
      signInput: 'साइन इनपुट',
      voiceInput: 'वाचन इनपुट',
      textInput: 'पाठ इनपुट',
      back: 'पीछे',
    },
  };

  const t = translations[language];

  // Handle login
  const handleLogin = async (email: string, password: string) => {
    try {
      const response = await auth.login(email, password);
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setAuthPage(null);
    } catch (error: any) {
      console.error('Login failed:', error);
      const message = error.response?.data?.message || (error.code === 'ERR_NETWORK' ? 'Cannot connect to server. Please ensure the backend is running.' : 'Login failed. Please try again.');
      alert(message);
    }
  };

  // Handle registration
  const handleRegister = async (name: string, email: string, password: string) => {
    try {
      const response = await auth.register(name, email, password, language);
      const { user, token } = response.data;
      localStorage.setItem('token', token);
      setUser(user);
      setAuthPage(null);
    } catch (error: any) {
      console.error('Registration failed:', error);
      const message = error.response?.data?.message || (error.code === 'ERR_NETWORK' ? 'Cannot connect to server. Please ensure the backend is running.' : 'Registration failed. Please try again.');
      alert(message);
    }
  };

  // Handle logout
  const handleLogout = () => {
    auth.logout().catch(console.error);
    localStorage.removeItem('token');
    setUser(null);
    setAuthPage('login');
    setInputMode(null);
  };

  // Check for existing session
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      auth.getMe()
        .then(response => {
          setUser(response.data.user);
          setAuthPage(null);
        })
        .catch((error) => {
          console.error('Session check failed:', error);
          // Only clear token if it's an authentication error (401)
          // Network errors (no response) should NOT clear the token
          if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
          } else if (!error.response) {
            // Network error - maybe show a toast or message
            console.warn('Server unreachable, keeping session for retry.');
          }
        });
    }
  }, []);

  // Show login/register if not authenticated
  if (!user) {
    if (authPage === 'login') {
      return (
        <Login
          language={language}
          onLogin={handleLogin}
          onSwitchToRegister={() => setAuthPage('register')}
        />
      );
    } else if (authPage === 'register') {
      return (
        <Register
          language={language}
          onRegister={handleRegister}
          onSwitchToLogin={() => setAuthPage('login')}
        />
      );
    }
  }

  return (
    <div className="min-h-screen w-full flex flex-col">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {/* User Profile */}
        {user && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg border border-gray-200">
            <User className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-700">{user.name}</span>
            <button
              onClick={handleLogout}
              className="ml-2 p-1 hover:bg-gray-100 rounded transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        )}

        <div className="relative" ref={languageMenuRef}>
          <button
            onClick={() => setShowLanguageMenu(!showLanguageMenu)}
            className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 border border-gray-200"
            aria-label="Select language"
          >
            <Languages className="w-5 h-5 text-indigo-600" />
            <span className="font-medium text-gray-700">
              {languages.find((l) => l.code === language)?.name}
            </span>
          </button>

          {showLanguageMenu && (
            <div
              className="absolute top-full right-0 mt-2 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden min-w-[160px]"
            >
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => {
                    setLanguage(lang.code);
                    setShowLanguageMenu(false);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-indigo-50 transition-colors ${language === lang.code ? 'bg-indigo-100 text-indigo-700' : 'text-gray-700'
                    }`}
                >
                  {lang.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!inputMode ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-4xl w-full">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl mb-4 text-gray-800">{t.title}</h1>
              <p className="text-xl text-gray-600">{t.subtitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Sign Input Button */}
              <button
                onClick={() => setInputMode('sign')}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-indigo-500"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-500 transition-colors duration-300">
                    <Video className="w-10 h-10 text-indigo-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h2 className="text-2xl text-gray-800">{t.signInput}</h2>
                  <p className="text-gray-500 text-center">Use camera for sign language</p>
                </div>
              </button>

              {/* Voice Input Button */}
              <button
                onClick={() => setInputMode('voice')}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-green-500"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-500 transition-colors duration-300">
                    <Mic className="w-10 h-10 text-green-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h2 className="text-2xl text-gray-800">{t.voiceInput}</h2>
                  <p className="text-gray-500 text-center">Speak to communicate</p>
                </div>
              </button>

              {/* Text Input Button */}
              <button
                onClick={() => setInputMode('text')}
                className="group relative bg-white rounded-2xl p-8 shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-transparent hover:border-purple-500"
              >
                <div className="flex flex-col items-center gap-4">
                  <div className="w-20 h-20 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-500 transition-colors duration-300">
                    <MessageSquare className="w-10 h-10 text-purple-600 group-hover:text-white transition-colors duration-300" />
                  </div>
                  <h2 className="text-2xl text-gray-800">{t.textInput}</h2>
                  <p className="text-gray-500 text-center">Type your message</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          {/* Back Button */}
          <div className="p-4">
            <button
              onClick={() => setInputMode(null)}
              className="px-6 py-3 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-gray-700 font-medium"
            >
              ← {t.back}
            </button>
          </div>

          {/* Input Mode Component */}
          <div className="flex-1 flex items-center justify-center p-4">
            {inputMode === 'sign' && <SignInput language={language} />}
            {inputMode === 'voice' && <VoiceInput language={language} />}
            {inputMode === 'text' && <TextInput language={language} />}
          </div>
        </div>
      )}
    </div>
  );
}