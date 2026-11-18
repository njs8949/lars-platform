import React from 'react';
import { BarChart3, Settings, LogOut } from 'lucide-react';

export const HomePage = ({ onLogout }: { onLogout: () => void }) => {
  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">LARS Prism</h1>
            <p className="text-slate-400">AI-Powered Enterprise Platform</p>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>

        {/* 기능 카드 그리드 */}
        <div className="grid grid-cols-3 gap-6 mb-12">
          {[
            { icon: '🔗', title: '웹 스크래핑', desc: 'CSS/XPath 셀렉터로 데이터 추출' },
            { icon: '📄', title: 'OCR', desc: '문서 스캔 및 테이블 추출' },
            { icon: '👁️', title: '변경 감지', desc: '웹사이트 변경 모니터링' },
            { icon: '📊', title: 'SEO 분석', desc: '키워드 순위 추적' },
            { icon: '👥', title: 'CRM', desc: '고객 관계 관리 시스템' },
            { icon: '⚙️', title: '워크플로우', desc: '자동화 파이프라인 구성' },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/50 transition"
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-sm text-slate-400">{feature.desc}</p>
            </div>
          ))}
        </div>

        {/* 시스템 상태 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <BarChart3 className="text-cyan-400" />
            <h2 className="text-xl font-semibold text-white">시스템 상태</h2>
          </div>
          <div className="grid grid-cols-4 gap-4">
            {[
              { name: '백엔드', status: '🟢 정상' },
              { name: '데이터베이스', status: '🟢 정상' },
              { name: 'Redis', status: '🟢 정상' },
              { name: 'Monitoring', status: '🟢 정상' },
            ].map((item, idx) => (
              <div key={idx} className="bg-slate-700/30 rounded-lg p-3">
                <p className="text-sm text-slate-400 mb-1">{item.name}</p>
                <p className="text-white font-medium">{item.status}</p>
              </div>
            ))}
          </div>
        </div>

        {/* 빠른 링크 */}
        <div className="bg-slate-800/50 backdrop-blur border border-slate-700/50 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Settings className="text-purple-400" size={20} />
            <h2 className="text-xl font-semibold text-white">빠른 접근</h2>
          </div>
          <div className="flex gap-3 flex-wrap">
            {[
              { label: 'API 문서', url: 'http://localhost:8001/docs' },
              { label: 'Prometheus', url: 'http://localhost:9090' },
              { label: 'Grafana', url: 'http://localhost:3001' },
              { label: '로컬 웹앱', url: 'http://localhost:5173' },
            ].map((link, idx) => (
              <a
                key={idx}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/40 text-cyan-400 rounded-lg transition text-sm"
              >
                {link.label} ↗
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HomePage;
