import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { BarChart3, CheckSquare, Network, LogOut, User } from 'lucide-react';
import { useAuth } from '../AuthContext';
import ManualPanel from './ManualPanel';

const NAV_ITEMS = [
  { to: '/', icon: BarChart3, label: '대시보드' },
  { to: '/tasks', icon: CheckSquare, label: '업무관리' },
  { to: '/org', icon: Network, label: '조직도' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* 사이드바 */}
      <aside className="w-56 bg-white border-r border-gray-100 flex flex-col shrink-0">
        <div className="p-5 border-b border-gray-100">
          <h1 className="text-xl font-bold text-blue-600 tracking-tight">WORKHIVE</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">업무 협업 관리 플랫폼</p>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={to === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${isActive ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'}`}>
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
              <User size={14} className="text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50 transition mt-1">
            <LogOut size={16} /> 로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 콘텐츠 */}
      <main className="flex-1 p-6 overflow-auto">
        <Outlet />
      </main>

      {/* 오른쪽 매뉴얼 패널 */}
      <ManualPanel />
    </div>
  );
}
