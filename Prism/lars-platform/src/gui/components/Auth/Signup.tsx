import React, { useState } from 'react';
import { signup, setToken } from '../../lib/auth';
import { Mail, Lock, User, Loader, AlertCircle, CheckCircle } from 'lucide-react';
import './Auth.css';

interface SignupProps {
  onSuccess: () => void;
  onSwitchToLogin: () => void;
}

export const Signup: React.FC<SignupProps> = ({ onSuccess, onSwitchToLogin }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [validations, setValidations] = useState({
    length: false,
    match: false,
  });

  const validatePassword = (pwd: string, confirm: string) => {
    setValidations({
      length: pwd.length >= 6,
      match: pwd === confirm && pwd.length > 0,
    });
  };

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd);
    validatePassword(pwd, confirmPassword);
  };

  const handleConfirmChange = (confirm: string) => {
    setConfirmPassword(confirm);
    validatePassword(password, confirm);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validations.length || !validations.match) {
      setError('비밀번호 요구사항을 충족해야 합니다');
      return;
    }

    setLoading(true);

    try {
      const result = await signup(email, username, password);
      setToken(result.token);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">회원가입</h2>

        {error && (
          <div className="auth-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="username">사용자명</label>
            <div className="input-wrapper">
              <User size={20} className="input-icon" />
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="사용자명"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">이메일</label>
            <div className="input-wrapper">
              <Mail size={20} className="input-icon" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="example@email.com"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">비밀번호</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => handlePasswordChange(e.target.value)}
                placeholder="최소 6자"
                required
                disabled={loading}
              />
            </div>
            <div className="password-requirements">
              <div className={`requirement ${validations.length ? 'met' : ''}`}>
                {validations.length ? <CheckCircle size={16} /> : <div className="dot" />}
                최소 6자
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm">비밀번호 확인</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => handleConfirmChange(e.target.value)}
                placeholder="비밀번호 다시 입력"
                required
                disabled={loading}
              />
            </div>
            <div className="password-requirements">
              <div className={`requirement ${validations.match ? 'met' : ''}`}>
                {validations.match ? <CheckCircle size={16} /> : <div className="dot" />}
                비밀번호 일치
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading || !validations.length || !validations.match}
          >
            {loading ? (
              <>
                <Loader size={20} className="spin" />
                회원가입 중...
              </>
            ) : (
              '회원가입'
            )}
          </button>
        </form>

        <div className="auth-footer">
          <p>이미 계정이 있으신가요? <button onClick={onSwitchToLogin}>로그인</button></p>
        </div>
      </div>
    </div>
  );
};
