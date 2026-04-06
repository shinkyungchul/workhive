import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, CheckSquare, Network, LogOut, User, Menu, X, BookOpen, Settings, Link2 } from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import ManualPanel from './ManualPanel';

const NAV_ITEMS = [
  { to: '/', icon: BarChart3, label: '대시보드' },
  { to: '/tasks', icon: CheckSquare, label: '업무관리' },
  { to: '/org', icon: Network, label: '조직도' },
  { to: '/board', icon: BookOpen, label: '관리 메뉴얼' },
  { to: '/links', icon: Link2, label: '링크 모음' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 모바일 오버레이 */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/30 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* 사이드바 */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-30 w-56 bg-white border-r border-gray-100 flex flex-col shrink-0 transform transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent tracking-tight">WORKHIVE</h1>
            <p className="text-[11px] text-gray-400 mt-0.5">업무 협업 관리 플랫폼</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'} onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive ? 'bg-blue-50 text-blue-600 font-medium shadow-sm' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-sm">
              <User size={14} className="text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role}{user?.dept ? ` · ${user.dept}` : ''}</p>
            </div>
          </div>
          <NavLink to="/profile" onClick={() => setSidebarOpen(false)}
            className={({ isActive }) => `w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition mt-1 ${isActive ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'}`}>
            <Settings size={16} /> 개인설정
          </NavLink>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* 모바일 헤더 */}
        <div className="lg:hidden flex items-center gap-3 p-4 bg-white border-b border-gray-100">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-gray-700">
            <Menu size={22} />
          </button>
          <h1 className="text-lg font-bold text-blue-600">WORKHIVE</h1>
        </div>
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* 오른쪽 매뉴얼 패널 */}
      <ManualPanel />
    </div>
  );
}
