import React, { useState, useEffect } from 'react';
import { LogOut, ExternalLink } from 'lucide-react';

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } catch (e) {
        console.error('Failed to parse stored user');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // 임시 인증 (실제로는 API 호출)
      const mockUser = {
        id: '1',
        email,
        name: email.split('@')[0],
      };
      localStorage.setItem('user', JSON.stringify(mockUser));
      setUser(mockUser);
      setIsLoggedIn(true);
      setEmail('');
      setPassword('');
    } catch (error) {
      console.error('Login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return (
      <div className="w-screen h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
            <h1 className="text-3xl font-bold text-white mb-2">LARS Prism</h1>
            <p className="text-slate-400 mb-8">AI-Powered Enterprise Platform</p>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-300 mb-2">이메일</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm text-slate-300 mb-2">비밀번호</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium disabled:opacity-50 transition"
              >
                {loading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <p className="text-center text-sm text-slate-400 mt-6">
              테스트용 이메일: test@lars.com
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-screen h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white">LARS Prism</h1>
            <p className="text-slate-400 text-lg">
              {user?.name}님, 환영합니다!
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
          >
            <LogOut size={20} />
            로그아웃
          </button>
        </div>

        {/* 메인 콘텐츠 */}
        <div className="flex-1 overflow-y-auto space-y-8">
          {/* 빠른 액세스 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">🚀 빠른 액세스</h2>
            <div className="grid grid-cols-2 gap-4">
              {[
                { name: 'API 문서', url: 'http://localhost:8001/docs', icon: '📚' },
                { name: 'Prometheus', url: 'http://localhost:9090', icon: '📊' },
                { name: 'Grafana', url: 'http://localhost:3001', icon: '📈' },
                { name: '웹 앱', url: 'http://localhost:5173', icon: '🌐' },
              ].map((link, idx) => (
                <a
                  key={idx}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-slate-700/30 hover:bg-slate-600/50 border border-slate-600/50 rounded-lg transition group"
                >
                  <span className="text-2xl">{link.icon}</span>
                  <div>
                    <p className="text-white font-medium group-hover:text-cyan-400">{link.name}</p>
                    <p className="text-xs text-slate-400">{link.url}</p>
                  </div>
                  <ExternalLink size={16} className="ml-auto text-slate-400" />
                </a>
              ))}
            </div>
          </div>

          {/* 시스템 상태 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">✅ 시스템 상태</h2>
            <div className="grid grid-cols-4 gap-4">
              {[
                { service: 'FastAPI', port: 8000, status: '🟢' },
                { service: 'PostgreSQL', port: 5432, status: '🟢' },
                { service: 'Redis', port: 6379, status: '🟢' },
                { service: 'Prometheus', port: 9090, status: '🟢' },
              ].map((item, idx) => (
                <div key={idx} className="bg-slate-700/30 border border-slate-600/50 rounded-lg p-4">
                  <p className="text-sm text-slate-400 mb-2">{item.service}</p>
                  <p className="text-lg font-semibold text-white">{item.status}</p>
                  <p className="text-xs text-slate-500 mt-2">:{item.port}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 정보 */}
          <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-4">ℹ️ 정보</h2>
            <div className="space-y-3 text-slate-300">
              <p>
                <strong>LARS Prism</strong>은 다음 기능을 제공합니다:
              </p>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>🔗 웹 스크래핑 (CSS/XPath 셀렉터)</li>
                <li>📄 OCR 문서 처리</li>
                <li>👁️ 웹사이트 변경 감지</li>
                <li>📊 SEO 분석 및 키워드 추적</li>
                <li>👥 CRM 시스템</li>
                <li>⚙️ 워크플로우 자동화</li>
                <li>📊 PPT 자동 생성</li>
                <li>🔗 데이터 파이프라인 통합</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="mt-8 pt-6 border-t border-slate-700/50 text-center text-sm text-slate-400">
          <p>© 2026 LARS Technologies. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
