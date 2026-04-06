import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Pin, ArrowLeft, Save, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Board() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [view, setView] = useState('list'); // list, detail, create, edit
  const [currentPost, setCurrentPost] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', pinned: false });

  const fetchPosts = () => api.get('/board').then(r => setPosts(r.data));

  useEffect(() => { fetchPosts(); }, []);

  const openCreate = () => {
    setForm({ title: '', content: '', pinned: false });
    setView('create');
  };

  const openDetail = (post) => {
    setCurrentPost(post);
    setView('detail');
  };

  const openEdit = (post) => {
    setCurrentPost(post);
    setForm({ title: post.title, content: post.content, pinned: post.pinned });
    setView('edit');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (view === 'create') {
      await api.post('/board', form);
    } else {
      await api.put(`/board/${currentPost.id}`, form);
    }
    fetchPosts();
    setView('list');
  };

  const handleDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/board/${id}`);
    fetchPosts();
    setView('list');
  };

  // 목록 뷰
  if (view === 'list') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-800">관리 메뉴얼</h2>
          <button onClick={openCreate}
            className="flex items-center gap-1 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Plus size={14} /> 글쓰기
          </button>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
              <Plus size={24} className="text-gray-300" />
            </div>
            <p className="text-lg font-medium text-gray-500">등록된 게시글이 없습니다</p>
            <p className="text-sm mt-1">"글쓰기" 버튼으로 메뉴얼을 작성해보세요</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-12"></th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500">제목</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-24">작성자</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 w-28">작성일</th>
                </tr>
              </thead>
              <tbody>
                {posts.map(post => (
                  <tr key={post.id} className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition"
                    onClick={() => openDetail(post)}>
                    <td className="px-4 py-3">
                      {post.pinned && <Pin size={14} className="text-blue-500" />}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${post.pinned ? 'font-semibold text-blue-700' : 'text-gray-800'}`}>
                        {post.pinned && <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded mr-2">공지</span>}
                        {post.title}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">{post.user_name}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">
                      {post.created_at ? new Date(post.created_at).toLocaleDateString('ko-KR') : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  // 상세 뷰
  if (view === 'detail' && currentPost) {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft size={16} /> 목록으로
        </button>
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <div className="flex items-start justify-between">
              <div>
                {currentPost.pinned && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded mb-2 inline-block">공지</span>}
                <h2 className="text-xl font-bold text-gray-800">{currentPost.title}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-400">
                  <span>{currentPost.user_name} ({currentPost.user_role})</span>
                  <span>{currentPost.created_at ? new Date(currentPost.created_at).toLocaleString('ko-KR') : ''}</span>
                </div>
              </div>
              {currentPost.user_id === user.id && (
                <div className="flex gap-2">
                  <button onClick={() => openEdit(currentPost)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">
                    <Edit3 size={14} /> 수정
                  </button>
                  <button onClick={() => handleDelete(currentPost.id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition">
                    <Trash2 size={14} /> 삭제
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="p-6">
            <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap leading-relaxed">
              {currentPost.content || '내용이 없습니다.'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 작성/수정 뷰
  return (
    <div className="space-y-4">
      <button onClick={() => setView('list')} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} /> 목록으로
      </button>
      <div className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="text-lg font-bold text-gray-800 mb-4">
          {view === 'create' ? '새 글 작성' : '글 수정'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">제목</label>
            <input type="text" placeholder="제목을 입력하세요" required value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1.5">내용</label>
            <textarea placeholder="내용을 입력하세요" rows={12} value={form.content}
              onChange={e => setForm({ ...form, content: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="pinned" checked={form.pinned}
              onChange={e => setForm({ ...form, pinned: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded border-gray-300" />
            <label htmlFor="pinned" className="text-sm text-gray-600">공지로 등록 (상단 고정)</label>
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={() => setView('list')}
              className="px-4 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">
              취소
            </button>
            <button type="submit"
              className="flex items-center gap-1 px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
              <Save size={14} /> {view === 'create' ? '등록' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
