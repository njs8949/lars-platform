import React, { useState } from 'react';
import { 
  Bell, 
  Settings, 
  HelpCircle, 
  Monitor, 
  ChevronDown, 
  FileText, 
  Edit3, 
  Eye, 
  Layers,
  Info
} from 'lucide-react';

interface TopMenuBarProps {
  onToggleSidebar: () => void;
  onShowAbout: () => void;
  onOpenSettings: () => void;
  onShowQuickMenu: (menu: string) => void;
}

const TopMenuBar: React.FC<TopMenuBarProps> = ({ 
  onToggleSidebar, 
  onShowAbout, 
  onOpenSettings,
  onShowQuickMenu
}) => {
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);

  const menus = [
    { id: 'file', label: '파일', items: ['새 프로젝트', '열기...', '저장', '내보내기', '종료'] },
    { id: 'edit', label: '편집', items: ['실행 취소', '다시 실행', '잘라내기', '복사', '붙여넣기', '찾기'] },
    { id: 'view', label: '보기', items: ['사이드바 토글', '로그 모니터', '터미널', '전체 화면'] },
    { id: 'window', label: '윈도우', items: ['최소화', '확대/축소', '앞으로 가져오기'] },
    { id: 'help', label: '도움말', items: ['문서 보기', '피드백 보내기', '정보 (About)'] },
  ];

  const notifications = [
    { id: 1, title: '시스템 업데이트', message: 'LARS Core v1.4.1 패치가 준비되었습니다.', time: '방금 전' },
    { id: 2, title: '보안 알림', message: '새로운 디바이스에서 로그인이 감지되었습니다.', time: '10분 전' },
  ];

  return (
    <header className="top-menu-bar">
      <div className="menu-items-container">
        {menus.map((menu) => (
          <div 
            key={menu.id} 
            className="menu-group"
            onMouseEnter={() => activeMenu && setActiveMenu(menu.id)}
            onClick={() => {
              setActiveMenu(activeMenu === menu.id ? null : menu.id);
              setShowNotifications(false);
            }}
          >
            <button className={`menu-label ${activeMenu === menu.id ? 'active' : ''}`}>
              {menu.label}
            </button>
            {activeMenu === menu.id && (
              <div className="menu-dropdown-list animate-in">
                {menu.items.map((item, idx) => (
                  <button 
                    key={idx} 
                    className="dropdown-item"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (item.includes('사이드바')) onToggleSidebar();
                      if (item.includes('정보')) onShowAbout();
                      if (item.includes('로그')) onShowQuickMenu('logs');
                      if (item.includes('터미널')) onShowQuickMenu('terminal');
                      setActiveMenu(null);
                    }}
                  >
                    {item}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="top-actions">
        <div className="menu-group">
          <button 
            className={`action-icon-btn ${showNotifications ? 'active' : ''}`} 
            onClick={() => {
              setShowNotifications(!showNotifications);
              setActiveMenu(null);
            }}
            title="알림"
          >
            <Bell size={18} />
            <span className="notification-badge" />
          </button>
          {showNotifications && (
            <div className="menu-dropdown-list notifications-dropdown animate-in">
              <div className="dropdown-header">최근 알림</div>
              {notifications.map(n => (
                <div key={n.id} className="notification-item">
                  <div className="notification-title">{n.title}</div>
                  <div className="notification-msg">{n.message}</div>
                  <div className="notification-time">{n.time}</div>
                </div>
              ))}
              <button className="view-all-btn">모든 알림 보기</button>
            </div>
          )}
        </div>
        <button className="action-icon-btn" onClick={onOpenSettings} title="설정">
          <Settings size={18} />
        </button>
        <button className="action-icon-btn" title="도움말">
          <HelpCircle size={18} />
        </button>
      </div>

      {(activeMenu || showNotifications) && <div className="menu-overlay-transparent" onClick={() => { setActiveMenu(null); setShowNotifications(false); }} />}
    </header>
  );
};

export default TopMenuBar;
