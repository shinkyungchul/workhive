import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, ExternalLink, Link2, X } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function Links() {
  const { user } = useAuth();
  const [links, setLinks] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingLink, setEditingLink] = useState(null);
  const [form, setForm] = useState({ title: '', url: '', description: '' });

  const fetchLinks = () => api.get('/links').then(r => setLinks(r.data));
  useEffect(() => { fetchLinks(); }, []);

  const openCreate = () => {
    setEditingLink(null);
    setForm({ title: '', url: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (link) => {
    setEditingLink(link);
    setForm({ title: link.title, url: link.url, description: link.description || '' });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingLink) {
      await api.put(`/links/${editingLink.id}`, form);
    } else {
      await api.post('/links', form);
    }
    setShowModal(false);
    fetchLinks();
  };

  const handleDelete = async (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    await api.delete(`/links/${id}`);
    fetchLinks();
  };

  const getDomain = (url) => {
    try { return new URL(url).hostname; } catch { return url; }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">링크 모음</h2>
        <button onClick={openCreate}
          className="flex items-center gap-1 px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          <Plus size={14} /> 링크 추가
        </button>
      </div>

      {links.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <Link2 size={24} className="text-gray-300" />
          </div>
          <p className="text-lg font-medium text-gray-500">등록된 링크가 없습니다</p>
          <p className="text-sm mt-1">"링크 추가" 버튼으로 자주 쓰는 링크를 등록해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {links.map(link => (
            <div key={link.id} className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-md transition group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                  <Link2 size={18} className="text-blue-500" />
                </div>
                {link.user_id === user.id && (
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button onClick={() => openEdit(link)} className="p-1.5 text-gray-400 hover:text-blue-500 rounded-lg hover:bg-blue-50">
                      <Edit3 size={13} />
                    </button>
                    <button onClick={() => handleDelete(link.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50">
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}
              </div>
              <h3 className="text-sm font-semibold text-gray-800 mb-1">{link.title}</h3>
              {link.description && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{link.description}</p>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400 truncate max-w-[60%]">{getDomain(link.url)}</span>
                <a href={link.url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-500 hover:text-blue-700 font-medium">
                  열기 <ExternalLink size={12} />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 등록/수정 모달 */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-lg font-semibold">{editingLink ? '링크 수정' : '링크 추가'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">제목</label>
                <input type="text" placeholder="예: 사내 인트라넷" required value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">URL</label>
                <input type="url" placeholder="https://example.com" required value={form.url}
                  onChange={e => setForm({ ...form, url: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">설명 <span className="text-gray-300">(선택)</span></label>
                <textarea placeholder="이 링크에 대한 설명" rows={3} value={form.description}
                  onChange={e => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm">취소</button>
                <button type="submit"
                  className="flex-1 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  {editingLink ? '저장' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
