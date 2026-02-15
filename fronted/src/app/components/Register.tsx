import { useState } from 'react';
import { UserPlus, Eye, EyeOff } from 'lucide-react';

type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ar' | 'hi';

interface RegisterProps {
  language: Language;
  onRegister: (name: string, email: string, password: string) => void;
  onSwitchToLogin: () => void;
}

const translations = {
  en: {
    title: 'Create Account',
    subtitle: 'Sign up to get started',
    name: 'Full Name',
    email: 'Email',
    password: 'Password',
    confirmPassword: 'Confirm Password',
    registerButton: 'Sign Up',
    haveAccount: 'Already have an account?',
    login: 'Login',
    namePlaceholder: 'Enter your full name',
    emailPlaceholder: 'Enter your email',
    passwordPlaceholder: 'Enter your password',
    confirmPasswordPlaceholder: 'Confirm your password',
    passwordMismatch: 'Passwords do not match',
  },
  es: {
    title: 'Crear Cuenta',
    subtitle: 'Regístrate para comenzar',
    name: 'Nombre Completo',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar Contraseña',
    registerButton: 'Registrarse',
    haveAccount: '¿Ya tienes una cuenta?',
    login: 'Iniciar Sesión',
    namePlaceholder: 'Ingresa tu nombre completo',
    emailPlaceholder: 'Ingresa tu correo electrónico',
    passwordPlaceholder: 'Ingresa tu contraseña',
    confirmPasswordPlaceholder: 'Confirma tu contraseña',
    passwordMismatch: 'Las contraseñas no coinciden',
  },
  fr: {
    title: 'Créer un Compte',
    subtitle: 'Inscrivez-vous pour commencer',
    name: 'Nom Complet',
    email: 'E-mail',
    password: 'Mot de passe',
    confirmPassword: 'Confirmer le mot de passe',
    registerButton: "S'inscrire",
    haveAccount: 'Vous avez déjà un compte?',
    login: 'Se Connecter',
    namePlaceholder: 'Entrez votre nom complet',
    emailPlaceholder: 'Entrez votre e-mail',
    passwordPlaceholder: 'Entrez votre mot de passe',
    confirmPasswordPlaceholder: 'Confirmez votre mot de passe',
    passwordMismatch: 'Les mots de passe ne correspondent pas',
  },
  de: {
    title: 'Konto Erstellen',
    subtitle: 'Registrieren Sie sich, um zu beginnen',
    name: 'Vollständiger Name',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort Bestätigen',
    registerButton: 'Registrieren',
    haveAccount: 'Haben Sie bereits ein Konto?',
    login: 'Anmelden',
    namePlaceholder: 'Geben Sie Ihren vollständigen Namen ein',
    emailPlaceholder: 'Geben Sie Ihre E-Mail ein',
    passwordPlaceholder: 'Geben Sie Ihr Passwort ein',
    confirmPasswordPlaceholder: 'Bestätigen Sie Ihr Passwort',
    passwordMismatch: 'Passwörter stimmen nicht überein',
  },
  zh: {
    title: '创建账户',
    subtitle: '注册以开始',
    name: '全名',
    email: '电子邮件',
    password: '密码',
    confirmPassword: '确认密码',
    registerButton: '注册',
    haveAccount: '已有账户？',
    login: '登录',
    namePlaceholder: '输入您的全名',
    emailPlaceholder: '输入您的电子邮件',
    passwordPlaceholder: '输入您的密码',
    confirmPasswordPlaceholder: '确认您的密码',
    passwordMismatch: '密码不匹配',
  },
  ar: {
    title: 'إنشاء حساب',
    subtitle: 'سجل للبدء',
    name: 'الاسم الكامل',
    email: 'البريد الإلكتروني',
    password: 'كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    registerButton: 'التسجيل',
    haveAccount: 'هل لديك حساب؟',
    login: 'تسجيل الدخول',
    namePlaceholder: 'أدخل اسمك الكامل',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPasswordPlaceholder: 'تأكيد كلمة المرور',
    passwordMismatch: 'كلمات المرور غير متطابقة',
  },
  hi: {
    title: 'खाता बनाएं',
    subtitle: 'शुरू करने के लिए साइन अप करें',
    name: 'पूरा नाम',
    email: 'ईमेल',
    password: 'पासवर्ड',
    confirmPassword: 'पासवर्ड की पुष्टि करें',
    registerButton: 'साइन अप',
    haveAccount: 'पहले से खाता है?',
    login: 'लॉगिन',
    namePlaceholder: 'अपना पूरा नाम दर्ज करें',
    emailPlaceholder: 'अपना ईमेल दर्ज करें',
    passwordPlaceholder: 'अपना पासवर्ड दर्ज करें',
    confirmPasswordPlaceholder: 'अपने पासवर्ड की पुष्टि करें',
    passwordMismatch: 'पासवर्ड मेल नहीं खाते',
  },
};

export function Register({ language, onRegister, onSwitchToLogin }: RegisterProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');

  const t = translations[language];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t.passwordMismatch);
      return;
    }

    if (name && email && password) {
      onRegister(name, email, password);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-indigo-600" />
            </div>
            <h1 className="text-3xl mb-2 text-gray-800">{t.title}</h1>
            <p className="text-gray-600">{t.subtitle}</p>
          </div>

          {/* Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name Input */}
            <div>
              <label htmlFor="name" className="block text-sm mb-2 text-gray-700">
                {t.name}
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.namePlaceholder}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm mb-2 text-gray-700">
                {t.email}
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPlaceholder}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm mb-2 text-gray-700">
                {t.password}
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
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

            {/* Confirm Password Input */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm mb-2 text-gray-700"
              >
                {t.confirmPassword}
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t.confirmPasswordPlaceholder}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none transition-colors pr-12"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Register Button */}
            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-lg hover:shadow-xl text-lg"
            >
              {t.registerButton}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {t.haveAccount}{' '}
              <button
                onClick={onSwitchToLogin}
                className="text-indigo-600 hover:text-indigo-700 hover:underline"
              >
                {t.login}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
