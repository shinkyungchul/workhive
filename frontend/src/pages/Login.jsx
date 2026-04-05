import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import api from '../api';

const ROLES = ['팀장', '과장', '대리', '주임', '사원', '팀원'];

export default function Login() {
  const [tab, setTab] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '사원', dept: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* 헤더 */}
        <div className="bg-blue-600 text-white p-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">WORKHIVE</h1>
          <p className="text-blue-200 mt-1 text-sm">업무 협업 관리 플랫폼</p>
        </div>

        {/* 탭 */}
        <div className="flex border-b">
          {[['login', '로그인'], ['register', '회원가입']].map(([key, label]) => (
            <button key={key} onClick={() => { setTab(key); setError(''); }}
              className={`flex-1 py-3 text-sm font-medium transition ${tab === key ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-400 hover:text-gray-600'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{error}</div>}

          {tab === 'register' && (
            <input type="text" placeholder="이름" required value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
          )}

          <input type="email" placeholder="이메일" required value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />

          <input type="password" placeholder="비밀번호" required value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })}
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />

          {tab === 'register' && (
            <>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input type="text" placeholder="부서 (선택)" value={form.dept}
                onChange={e => setForm({ ...form, dept: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none text-sm" />
            </>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? '처리중...' : tab === 'login' ? '로그인' : '가입하기'}
          </button>
        </form>
      </div>
    </div>
  );
}
