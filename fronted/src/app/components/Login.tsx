import { useState } from 'react';
import { LogIn, Eye, EyeOff } from 'lucide-react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface LoginProps {
  language: Language;
  onLogin: (email: string, password: string) => void;
  onSwitchToRegister: () => void;
}

const translations = {
  en: {
    title: 'Welcome Back',
    subtitle: 'Login to continue',
    email: 'Email',
    password: 'Password',
    loginButton: 'Login',
    noAccount: "Don't have an account?",
    signUp: 'Sign Up',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
  },
  es: {
    title: 'Bienvenido de Nuevo',
    subtitle: 'Inicia sesión para continuar',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    loginButton: 'Iniciar Sesión',
    noAccount: '¿No tienes una cuenta?',
    signUp: 'Registrarse',
    emailPlaceholder: 'Ingresa tu correo electrónico',
    passwordPlaceholder: 'Ingresa tu contraseña',
  },
  fr: {
    title: 'Bon Retour',
    subtitle: 'Connectez-vous pour continuer',
    email: 'E-mail',
    password: 'Mot de passe',
    loginButton: 'Se Connecter',
    noAccount: "Vous n'avez pas de compte?",
    signUp: "S'inscrire",
    emailPlaceholder: 'Entrez votre e-mail',
    passwordPlaceholder: 'Entrez votre mot de passe',
  },
  de: {
    title: 'Willkommen Zurück',
    subtitle: 'Melden Sie sich an, um fortzufahren',
    email: 'E-Mail',
    password: 'Passwort',
    loginButton: 'Anmelden',
    noAccount: 'Haben Sie kein Konto?',
    signUp: 'Registrieren',
    emailPlaceholder: 'Geben Sie Ihre E-Mail ein',
    passwordPlaceholder: 'Geben Sie Ihr Passwort ein',
  },
  zh: {
    title: '欢迎回来',
    subtitle: '登录以继续',
    email: '电子邮件',
    password: '密码',
    loginButton: '登录',
    noAccount: '还没有账户？',
    signUp: '注册',
    emailPlaceholder: '输入您的电子邮件',
    passwordPlaceholder: '输入您的密码',
  },
  ar: {
    title: 'مرحبًا بعودتك',
    subtitle: 'تسجيل الدخول للمتابعة',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    loginButton: 'تسجيل الدخول',
    noAccount: 'ليس لديك حساب؟',
    signUp: 'التسجيل',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    passwordPlaceholder: 'أدخل كلمة المرور',
  },
  hi: {
    title: 'वापस स्वागत है',
    subtitle: 'जारी रखने के लिए लॉगिन करें',
    email: 'ईमेल',
    password: 'पासवर्ड',
    loginButton: 'लॉगिन',
    noAccount: 'खाता नहीं है?',
    signUp: 'साइन अप करें',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
  },
};

export function Login({ language, onLogin, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const t = translations[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email && password) {
      onLogin(email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <LogIn className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl mb-2 text-gray-800">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Input */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm mb-2 text-gray-700"
              >
                {t.email}
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm mb-2 text-gray-700"
              >
                {t.password}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.passwordPlaceholder}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl text-lg"
            >
              {t.loginButton}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t.noAccount}{' '}
              <button
                onClick={onSwitchToRegister}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {t.signUp}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
