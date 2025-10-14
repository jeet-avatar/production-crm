import { useState } from 'react';

export function LoginPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${apiUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      localStorage.setItem('crmToken', data.token);
      localStorage.setItem('crmUser', JSON.stringify(data.user));

      // Check if user needs to change password
      if (data.requirePasswordChange) {
        window.location.href = '/change-password';
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      console.error('Login error:', err);
      setError(err.message || 'Failed to login. Please try again.');
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect to Google OAuth endpoint
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
    window.location.href = `${apiUrl}/api/auth/google`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex">
      {/* Left side - Form */}
      <div className="flex-1 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Logo */}
          <div>
            <div className="flex items-center mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white font-bold text-2xl">C</span>
              </div>
              <span className="ml-3 text-2xl font-bold tracking-tight text-gray-900">CRM Pro</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight text-gray-900">Welcome back</h2>
            <p className="mt-2 text-base font-medium text-gray-600">
              Sign in to your account to continue
            </p>
          </div>

          <div className="mt-8">
            {/* Google Sign In Button */}
            <div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full btn-secondary"
              >
                Continue with Google
              </button>
            </div>

            {/* Divider */}
            <div className="relative mt-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-sm font-semibold text-gray-500 uppercase tracking-wider">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <div className="text-sm font-semibold text-red-800">{error}</div>
              </div>
            )}

            {/* Login Form */}
            <form className="mt-6 space-y-4" onSubmit={handleSubmit} autoComplete="off">
              {/* Email Input */}
              <div>
                <label htmlFor="login-email" className="block text-sm font-semibold text-gray-700 mb-2">
                  Email address
                </label>
                <input
                  id="login-email"
                  name="login-email"
                  type="text"
                  autoComplete="new-password"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck="false"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="Enter your email"
                />
              </div>

              {/* Password Input */}
              <div>
                <label htmlFor="login-password" className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    name="login-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck="false"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-field pr-10"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors text-sm"
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-sm font-medium text-gray-700">
                    Remember me
                  </label>
                </div>

                <div className="text-sm">
                  <a href="/forgot-password" className="font-medium text-blue-600 hover:text-blue-700">
                    Forgot password?
                  </a>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full btn-primary"
              >
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </form>

            {/* Sign Up Link */}
            <p className="mt-6 text-center text-base font-medium text-gray-700">
              Don't have an account?{' '}
              <a href="/signup" className="text-blue-600 hover:text-purple-600 font-bold transition-colors">
                Sign up for free
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Right side - Branding */}
      <div className="hidden lg:block relative w-0 flex-1">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700">
          <div className="h-full w-full flex flex-col items-center justify-center p-12 text-white">
            <div className="max-w-md">
              <h1 className="text-4xl font-bold tracking-tight mb-6">
                Manage Your Business Like a Pro
              </h1>
              <p className="text-lg text-blue-100 mb-8">
                Streamline your customer relationships, boost sales, and grow your business with our powerful CRM platform.
              </p>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">360° Customer View</p>
                    <p className="text-sm text-blue-100">Track every interaction and deal in one place</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">AI-Powered Insights</p>
                    <p className="text-sm text-blue-100">Get smart recommendations to close more deals</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="font-semibold">Seamless Integration</p>
                    <p className="text-sm text-blue-100">Connect with Google, Outlook, and more</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Decorative Elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
