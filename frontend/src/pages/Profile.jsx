import { useState } from 'react';
import { Save, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Profile() {
  const { user, login } = useAuth();
  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    dept: user?.dept || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      return setError('새 비밀번호가 일치하지 않습니다');
    }
    if (form.newPassword && form.newPassword.length < 4) {
      return setError('비밀번호는 4자 이상이어야 합니다');
    }

    setLoading(true);
    try {
      const payload = {
        name: form.name,
        email: form.email,
        dept: form.dept
      };
      if (form.newPassword) {
        payload.currentPassword = form.currentPassword;
        payload.newPassword = form.newPassword;
      }

      const { data } = await api.put('/profile', payload);

      // localStorage 업데이트
      const token = localStorage.getItem('wh_token');
      login(data.user, token);

      setSuccess('설정이 저장되었습니다');
      setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setError(err.response?.data?.error || '저장 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <h2 className="text-lg font-bold text-gray-800">개인설정</h2>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 space-y-5">
        {error && (
          <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-100">{error}</div>
        )}
        {success && (
          <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg border border-green-100 flex items-center gap-2">
            <CheckCircle2 size={16} /> {success}
          </div>
        )}

        {/* 기본 정보 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">기본 정보</h3>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">이름</label>
            <input type="text" required value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">이메일</label>
            <input type="email" required value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
            <p className="text-xs text-gray-400 mt-1">업무 알림이 이 이메일로 발송됩니다</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">직급</label>
            <input type="text" disabled value={user?.role || ''}
              className="w-full px-4 py-2.5 border border-gray-100 rounded-lg bg-gray-50 text-sm text-gray-500" />
            <p className="text-xs text-gray-400 mt-1">직급은 관리자만 변경할 수 있습니다</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">부서</label>
            <input type="text" placeholder="예: 개발팀" value={form.dept}
              onChange={e => setForm({ ...form, dept: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
        </div>

        {/* 비밀번호 변경 */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-700 border-b border-gray-100 pb-2">비밀번호 변경</h3>
          <p className="text-xs text-gray-400">변경하지 않으려면 비워두세요</p>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">현재 비밀번호</label>
            <div className="relative">
              <input type={showCurrent ? 'text' : 'password'} value={form.currentPassword}
                onChange={e => setForm({ ...form, currentPassword: e.target.value })}
                placeholder="현재 비밀번호"
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">새 비밀번호</label>
            <div className="relative">
              <input type={showNew ? 'text' : 'password'} value={form.newPassword}
                onChange={e => setForm({ ...form, newPassword: e.target.value })}
                placeholder="새 비밀번호 (4자 이상)"
                className="w-full px-4 py-2.5 pr-10 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              <button type="button" onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">새 비밀번호 확인</label>
            <input type="password" value={form.confirmPassword}
              onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="새 비밀번호 다시 입력"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50">
          <Save size={16} />
          {loading ? '저장 중...' : '설정 저장'}
        </button>
      </form>
    </div>
  );
}
