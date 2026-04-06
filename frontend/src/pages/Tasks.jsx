import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Check, Download, FileText, FileSpreadsheet, MessageSquare, Paperclip, Send, X, File } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

const TYPE_LABELS = { inst: '지시사항', rep: '보고사항', shared: '공유사항' };
const STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700' };

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [tab, setTab] = useState('inst');
  const [showModal, setShowModal] = useState(false);
  const [detailTask, setDetailTask] = useState(null);
  const [seniors, setSeniors] = useState([]);
  const [juniors, setJuniors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [form, setForm] = useState({ title: '', content: '', to_user_id: '', due_date: '' });

  // 댓글 & 첨부
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const fileInputRef = useRef(null);

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
    if (detailTask?.id === id) setDetailTask(null);
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

  // 상세 열기
  const openDetail = (task) => {
    setDetailTask(task);
    api.get(`/comments/${task.id}`).then(r => setComments(r.data));
    api.get(`/attachments/${task.id}`).then(r => setAttachments(r.data));
  };

  // 댓글 등록
  const postComment = async () => {
    if (!commentText.trim()) return;
    const { data } = await api.post(`/comments/${detailTask.id}`, { content: commentText });
    setComments(prev => [...prev, data]);
    setCommentText('');
  };

  // 댓글 삭제
  const deleteComment = async (id) => {
    await api.delete(`/comments/${id}`);
    setComments(prev => prev.filter(c => c.id !== id));
  };

  // 파일 업로드
  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post(`/attachments/${detailTask.id}`, fd, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    setAttachments(prev => [...prev, data]);
    fileInputRef.current.value = '';
  };

  // 파일 삭제
  const deleteAttachment = async (id) => {
    await api.delete(`/attachments/${id}`);
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  // 파일 다운로드
  const downloadAttachment = (filename, originalName) => {
    api.get(`/attachments/download/${filename}`, { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url; a.download = originalName;
      a.click(); URL.revokeObjectURL(url);
    });
  };

  const formatSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
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

      {/* 업무 목록 */}
      {tasks.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Plus size={24} className="text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">등록된 {TYPE_LABELS[tab]}이 없습니다</p>
          <p className="text-sm mt-1">위의 "등록" 버튼으로 새 업무를 추가해보세요</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map(task => (
            <div key={task.id}
              className={`bg-white rounded-xl border p-4 hover:shadow-sm transition cursor-pointer ${task.status === 'done' ? 'border-green-200 bg-green-50/30' : 'border-gray-100'}`}
              onClick={() => openDetail(task)}>
              {/* 1줄: 상태 + 제목 */}
              <div className="flex items-center gap-2 mb-1">
                <button onClick={(e) => { e.stopPropagation(); toggleDone(task); }}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition shrink-0 ${task.status === 'done' ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-blue-400'}`}>
                  {task.status === 'done' && <Check size={12} />}
                </button>
                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[task.status]}`}>
                  {task.status === 'done' ? '완료' : '진행중'}
                </span>
                <span className={`text-sm font-medium flex-1 ${task.status === 'done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                  {task.title}
                </span>
                {task.from_user_id === user.id && (
                  <button onClick={(e) => { e.stopPropagation(); deleteTask(task.id); }} className="text-gray-300 hover:text-red-500 transition">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              {/* 2줄: 내용 */}
              {task.content && <p className="text-sm text-gray-500 ml-7 mb-1 line-clamp-1">{task.content}</p>}
              {/* 3줄: 발신/수신 + 마감일 */}
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
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

      {/* 업무 상세 모달 (댓글 + 첨부파일) */}
      {detailTask && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetailTask(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* 헤더 */}
            <div className="p-5 border-b border-gray-100 flex items-start justify-between shrink-0">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[detailTask.status]}`}>
                    {detailTask.status === 'done' ? '완료' : '진행중'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{TYPE_LABELS[detailTask.type]}</span>
                </div>
                <h3 className="text-lg font-semibold text-gray-800 truncate">{detailTask.title}</h3>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                  <span>{detailTask.from_name} → {detailTask.to_name || '전체'}</span>
                  {detailTask.due_date && <span className="text-orange-400">마감: {detailTask.due_date}</span>}
                </div>
              </div>
              <button onClick={() => setDetailTask(null)} className="text-gray-400 hover:text-gray-600 ml-2">
                <X size={20} />
              </button>
            </div>

            {/* 본문 + 댓글 + 첨부 스크롤 영역 */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* 본문 */}
              {detailTask.content && (
                <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 whitespace-pre-wrap">{detailTask.content}</div>
              )}

              {/* 첨부파일 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                    <Paperclip size={14} /> 첨부파일 ({attachments.length})
                  </h4>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                    파일 추가
                  </button>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} />
                </div>
                {attachments.length > 0 && (
                  <div className="space-y-1.5">
                    {attachments.map(a => (
                      <div key={a.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg text-sm">
                        <File size={14} className="text-blue-500 shrink-0" />
                        <button onClick={() => downloadAttachment(a.filename, a.original_name)}
                          className="text-blue-600 hover:underline truncate flex-1 text-left">{a.original_name}</button>
                        <span className="text-xs text-gray-400 shrink-0">{formatSize(a.size)}</span>
                        {a.user_id === user.id && (
                          <button onClick={() => deleteAttachment(a.id)} className="text-gray-300 hover:text-red-500 shrink-0">
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 댓글 */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 flex items-center gap-1.5 mb-3">
                  <MessageSquare size={14} /> 댓글 ({comments.length})
                </h4>
                <div className="space-y-3">
                  {comments.map(c => (
                    <div key={c.id} className="flex gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center shrink-0 text-xs font-medium text-blue-600">
                        {(c.user_name || '?')[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700">{c.user_name}</span>
                          <span className="text-xs text-gray-400">{c.user_role}</span>
                          <span className="text-xs text-gray-300">{(c.created_at || '').slice(0, 16).replace('T', ' ')}</span>
                          {c.user_id === user.id && (
                            <button onClick={() => deleteComment(c.id)} className="text-gray-300 hover:text-red-500 ml-auto">
                              <Trash2 size={11} />
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-0.5 whitespace-pre-wrap">{c.content}</p>
                      </div>
                    </div>
                  ))}
                  {comments.length === 0 && <p className="text-xs text-gray-400 text-center py-2">아직 댓글이 없습니다</p>}
                </div>
              </div>
            </div>

            {/* 댓글 입력 */}
            <div className="p-4 border-t border-gray-100 shrink-0">
              <div className="flex gap-2">
                <input type="text" placeholder="댓글을 입력하세요..." value={commentText}
                  onChange={e => setCommentText(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), postComment())}
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <button onClick={postComment}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
