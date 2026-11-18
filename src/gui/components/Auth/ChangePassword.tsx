import React, { useState } from 'react';
import { changePassword } from '../../lib/auth';
import { Lock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import './Auth.css';

interface ChangePasswordProps {
  onSuccess?: () => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ onSuccess }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validate inputs
      if (!currentPassword || !newPassword || !confirmPassword) {
        throw new Error('모든 필드를 입력해주세요');
      }

      if (newPassword !== confirmPassword) {
        throw new Error('새 비밀번호가 일치하지 않습니다');
      }

      if (newPassword.length < 6) {
        throw new Error('새 비밀번호는 최소 6자 이상이어야 합니다');
      }

      // Change password
      const result = await changePassword(currentPassword, newPassword);

      setSuccess(result.message || '비밀번호가 변경되었습니다');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      if (onSuccess) {
        setTimeout(onSuccess, 2000);
      }
    } catch (err: any) {
      let errorMessage = '비밀번호 변경 실패';

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.message) {
        errorMessage = err.message;
      }

      console.error('[ChangePassword] Error:', err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">🔐 비밀번호 변경</h2>

        {error && (
          <div className="auth-error">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="auth-success" style={{ display: 'flex', gap: '12px', padding: '12px', backgroundColor: 'rgba(34, 197, 94, 0.1)', borderRadius: '8px', marginBottom: '16px' }}>
            <CheckCircle size={20} style={{ color: '#22c55e' }} />
            <span style={{ color: '#22c55e' }}>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="current">현재 비밀번호</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="current"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="현재 비밀번호"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="new">새 비밀번호</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="new"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="새 비밀번호 (최소 6자)"
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="confirm">새 비밀번호 확인</label>
            <div className="input-wrapper">
              <Lock size={20} className="input-icon" />
              <input
                id="confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="새 비밀번호 확인"
                required
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={loading}
            style={{ marginTop: '16px' }}
          >
            {loading ? (
              <>
                <Loader size={20} className="spin" />
                변경 중...
              </>
            ) : (
              '비밀번호 변경'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
