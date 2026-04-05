import { useState, useEffect } from 'react';
import { Plus, Trash2, Check, RotateCcw, Download, FileText, FileSpreadsheet } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

const TYPE_LABELS = { inst: '지시사항', rep: '보고사항', shared: '공유사항' };
const STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700' };

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('inst');
  const [showModal, setShowModal] = useState(false);
  const [seniors, setSeniors] = useState([]);
  const [juniors, setJuniors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', to_user_id: '', due_date: '' });

  const fetchTasks = () => api.get(`/tasks?type=${tab}`).then(r => setTasks(r.data));

  useEffect(() => { fetchTasks(); }, [tab]);
  useEffect(() => {
    api.get('/relations/seniors').then(r => setSeniors(r.data));
    api.get('/relations/juniors').then(r => setJuniors(r.data));
    api.get('/users/list').then(r => setAllUsers(r.data));
  }, []);

  const getTargetUsers = () => {
    if (tab === 'inst') return juniors;
    if (tab === 'rep') return seniors;
    return allUsers.filter(u => u.id !== user.id);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    await api.post('/tasks', { ...form, type: tab });
    setShowModal(false);
    setForm({ title: '', content: '', to_user_id: '', due_date: '' });
    fetchTasks();
  };

  const toggleDone = async (task) => {
    if (task.status === 'pending') await api.patch(`/tasks/${task.id}/done`);
    else await api.patch(`/tasks/${task.id}/undone`);
    fetchTasks();
  };

  const deleteTask = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/tasks/${id}`);
    fetchTasks();
  };

  const downloadFile = (format) => {
    api.get(`/export/${format}?type=${tab}`, { responseType: 'blob' }).then(r => {
      const ext = format === 'word' ? 'docx' : 'xlsx';
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `WorkHive_${TYPE_LABELS[tab]}_${new Date().toISOString().slice(0,10)}.${ext}`;
      a.click(); URL.revokeObjectURL(url);
    });
  };

  return (
    <div className="space-y-4">
      {/* 탭 + 버튼 */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {Object.entries(TYPE_LABELS).map(([k, v]) => (
            <button key={k} onClick={() => setTab(k)}
              className={`px-4 py-1.5 text-sm rounded-md transition ${tab === k ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {v}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={() => downloadFile('word')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition">
            <FileText size={14} /> Word
          </button>
          <button onClick={() => downloadFile('excel')} className="flex items-center gap-1 px-3 py-1.5 text-sm bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition">
            <FileSpreadsheet size={14} /> Excel
          </button>
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus size={14} /> 등록
          </button>
        </div>
      </div>

      {/* 업무 목록 - 3줄 표기 */}
      {tasks.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-lg">등록된 {TYPE_LABELS[tab]}이 없습니다</p>
          <p className="text-sm mt-1">새 업무를 등록해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id} className={`bg-white rounded-xl border p-4 hover:shadow-sm transition ${task.status === 'done' ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}>
              {/* 1줄: 상태 + 유형 + 제목 */}
              <div className="flex items-center gap-2 mb-1">
                <button onClick={() => toggleDone(task)} className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${task.status === 'done' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-blue-400'}`}>
                  {task.status === 'done' && <Check size={12} />}
                </button>
                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[task.status]}`}>
                  {task.status === 'done' ? '완료' : '진행중'}
                </span>
                <span className={`text-sm font-medium flex-1 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.title}
                </span>
                {task.from_user_id === user.id && (
                  <button onClick={() => deleteTask(task.id)} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {/* 2줄: 내용 */}
              {task.content && <p className="text-sm text-gray-500 ml-7 mb-1 line-clamp-1">{task.content}</p>}
              {/* 3줄: 발신/수신 + 마감일 + 등록일 */}
              <div className="flex items-center gap-3 ml-7 text-xs text-gray-400">
                <span>{task.from_name} → {task.to_name || '전체'}</span>
                {task.due_date && <span className="text-orange-400">마감: {task.due_date}</span>}
                <span>{(task.created_at || '').slice(0, 10)}</span>
                {task.done_at && <span className="text-green-500">완료: {task.done_at.slice(0, 10)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">{TYPE_LABELS[tab]} 등록</h3>
              <form onSubmit={handleCreate} className="space-y-3">
                <input type="text" placeholder="제목" required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <textarea placeholder="내용" rows={3} value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
                {tab !== 'shared' && (
                  <select value={form.to_user_id} onChange={e => setForm({ ...form, to_user_id: e.target.value })} required
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="">{tab === 'inst' ? '후임 선택' : '선임 선택'}</option>
                    {getTargetUsers().map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                )}
                {tab === 'shared' && (
                  <select value={form.to_user_id} onChange={e => setForm({ ...form, to_user_id: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm">
                    <option value="">대상자 선택 (선택)</option>
                    {getTargetUsers().map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                  </select>
                )}
                <input type="date" value={form.due_date}
                  onChange={e => setForm({ ...form, due_date: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                <div className="flex gap-2 pt-2">
                  <button type="button" onClick={() => setShowModal(false)}
                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">취소</button>
                  <button type="submit"
                    className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">등록</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
