import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';
import { Eye, EyeOff, LogIn, UserPlus } from 'lucide-react';

const ROLES = ['팀장', '과장', '대리', '주임', '사원', '팀원'];

export default function Login() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '사원', dept: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (tab === 'login') {
        const { data } = await api.post('/users/login', { email: form.email, password: form.password });
        login(data.user, data.token);
      } else {
        const { data } = await api.post('/users/register', form);
        login(data.user, data.token);
      }
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || '오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-gray-100">
        {/* 헤더 */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-10">
            <div className="absolute -top-10 -right-10 w-40 h-40 border-4 border-white rounded-full"></div>
            <div className="absolute -bottom-5 -left-5 w-24 h-24 border-4 border-white rounded-full"></div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight relative">WORKHIVE</h1>
          <p className="text-blue-200 mt-1.5 text-sm relative">업무 협업 관리 플랫폼</p>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100">
          {[['login', '로그인', LogIn], ['register', '회원가입', UserPlus]].map(([key, label, Icon]) => (
            <button key={key} onClick={() => { setTab(key); setError(''); }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-sm font-medium transition ${tab === key ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50' : 'text-gray-400 hover:text-gray-600'}`}>
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100 flex items-center gap-2">
              <span className="shrink-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              {error}
            </div>
          )}

          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">이름</label>
              <input type="text" placeholder="홍길동" required value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">이메일</label>
            <input type="email" placeholder="example@company.com" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">비밀번호</label>
            <div className="relative">
              <input type={showPw ? 'text' : 'password'} placeholder="비밀번호 입력" required value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
              <button type="button" onClick={() => setShowPw(!showPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {tab === 'register' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">직급</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white">
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">부서 <span className="text-gray-300">(선택)</span></label>
                <input type="text" placeholder="예: 개발팀" value={form.dept}
                  onChange={e => setForm({ ...form, dept: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
              </div>
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50 shadow-sm">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                처리중...
              </span>
            ) : tab === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
