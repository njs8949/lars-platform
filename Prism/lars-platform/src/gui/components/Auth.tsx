import React, { useState } from 'react';
import { Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { login as loginWithServer, signup as signupWithServer, setToken as setAuthToken, setUser as setStoredUser } from '../lib/auth';
import '../styles/Auth.css';

interface AuthProps {
  onAuthSuccess: (user: { email: string; username: string }) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    // 예전 임시 로컬 계정 목록은 더 이상 쓰지 않는다 (비밀번호를 브라우저에 두지 않도록 지운다)
    localStorage.removeItem('accounts');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // 서버 계정으로 로그인하거나 가입한다. 토큰과 사용자 정보는 서버가 발급한 값을 쓴다.
      const data = isLogin
        ? await loginWithServer(email, password)
        : await signupWithServer(email, username || email.split('@')[0], password);
      setAuthToken(data.token);
      setStoredUser(data.user);
      onAuthSuccess({ email: data.user.email, username: data.user.username });
    } catch (err) {
      setError(err instanceof Error ? err.message : '오류가 발생했습니다. 다시 시도해주세요.');
      console.error('[AUTH]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = () => {
    const demoUser = { email: 'demo@lars.local', username: 'Demo User' };
    localStorage.setItem('auth_token', 'dev-demo-token');
    localStorage.setItem('auth_user', JSON.stringify(demoUser));
    onAuthSuccess(demoUser);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1>LARS Prism</h1>
          <p className="auth-subtitle">AI-Powered Development Platform</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="auth-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(true);
                setError('');
              }}
            >
              <LogIn size={18} />
              로그인
            </button>
            <button
              type="button"
              className={`mode-btn ${!isLogin ? 'active' : ''}`}
              onClick={() => {
                setIsLogin(false);
                setError('');
              }}
            >
              <UserPlus size={18} />
              회원가입
            </button>
          </div>

          {error && <div className="auth-error">{error}</div>}

          {!isLogin && (
            <div className="auth-input-group">
              <label htmlFor="username">사용자명</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="사용자명을 입력하세요"
                disabled={loading}
                required
              />
            </div>
          )}

          <div className="auth-input-group">
            <label htmlFor="email">
              <Mail size={16} />
              이메일
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              disabled={loading}
              required
            />
          </div>

          <div className="auth-input-group">
            <label htmlFor="password">
              <Lock size={16} />
              비밀번호
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={loading}
              required
            />
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? '처리 중...' : (isLogin ? '로그인' : '회원가입')}
          </button>
        </form>

        <div className="auth-divider">또는</div>

        <button
          type="button"
          className="auth-demo-btn"
          onClick={handleDemoLogin}
          disabled={loading}
        >
          데모 계정으로 시작하기
        </button>

        <div className="auth-info">
          <p>💡 개발 환경용 임시 인증 시스템</p>
          <p className="auth-hint">저장된 계정 정보는 브라우저 로컬스토리지에만 보관됩니다.</p>
        </div>
      </div>
    </div>
  );
};
