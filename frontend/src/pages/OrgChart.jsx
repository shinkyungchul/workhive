import { useState, useEffect, useRef, useCallback } from 'react';
import { Link2, X, Save } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

export default function OrgChart() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [positions, setPositions] = useState({});
  const [relations, setRelations] = useState([]);
  const [linking, setLinking] = useState(null); // 연결 모드: senior id
  const [dragging, setDragging] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const canvasRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.get('/users/list'),
      api.get('/org/positions'),
      api.get('/relations')
    ]).then(([u, p, r]) => {
      setUsers(u.data);
      // 위치가 없는 사용자에게 기본 위치 부여
      const pos = { ...p.data };
      u.data.forEach((usr, i) => {
        if (!pos[usr.id]) {
          pos[usr.id] = { x: 100 + (i % 4) * 200, y: 80 + Math.floor(i / 4) * 140 };
        }
      });
      setPositions(pos);
      setRelations(r.data);
    });
  }, []);

  const savePositions = () => {
    api.put('/org/positions', positions).then(() => alert('위치가 저장되었습니다'));
  };

  const handleMouseDown = (e, userId) => {
    if (linking) {
      // 연결 모드에서 클릭 = 후임 지정
      if (linking !== userId) {
        api.post('/relations', { senior_id: linking, junior_id: userId }).then(() => {
          api.get('/relations').then(r => setRelations(r.data));
        });
      }
      setLinking(null);
      return;
    }
    const rect = canvasRef.current.getBoundingClientRect();
    setDragging(userId);
    setDragOffset({ x: e.clientX - (positions[userId]?.x || 0) - rect.left, y: e.clientY - (positions[userId]?.y || 0) - rect.top });
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragging) return;
    const rect = canvasRef.current.getBoundingClientRect();
    setPositions(prev => ({
      ...prev,
      [dragging]: { x: e.clientX - dragOffset.x - rect.left, y: e.clientY - dragOffset.y - rect.top }
    }));
  }, [dragging, dragOffset]);

  const handleMouseUp = () => setDragging(null);

  const deleteRelation = (relId) => {
    api.delete(`/relations/${relId}`).then(() => {
      setRelations(prev => prev.filter(r => r.id !== relId));
    });
  };

  const ROLE_COLORS = {
    '팀장': '#2563eb', '과장': '#7c3aed', '대리': '#059669',
    '주임': '#d97706', '사원': '#6b7280', '팀원': '#94a3b8'
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          <button onClick={() => setLinking(linking ? null : '__PICK_SENIOR__')}
            className={`flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg transition ${linking ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            <Link2 size={14} /> {linking ? '연결 취소' : '관계 연결'}
          </button>
          <button onClick={savePositions}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            <Save size={14} /> 위치 저장
          </button>
        </div>
        {linking && <span className="text-sm text-orange-500 font-medium">
          {linking === '__PICK_SENIOR__' ? '선임을 클릭하세요' : '후임을 클릭하세요'}
        </span>}
      </div>

      <div ref={canvasRef}
        className="relative bg-gray-50 rounded-xl border border-gray-200 overflow-hidden"
        style={{ height: '600px' }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}>

        {/* SVG 관계 라인 */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 1 }}>
          {relations.map(rel => {
            const sp = positions[rel.senior_id];
            const jp = positions[rel.junior_id];
            if (!sp || !jp) return null;
            const sx = sp.x + 75, sy = sp.y + 40;
            const jx = jp.x + 75, jy = jp.y + 40;
            const mx = (sx + jx) / 2, my = (sy + jy) / 2;
            return (
              <g key={rel.id}>
                <line x1={sx} y1={sy} x2={jx} y2={jy} stroke="#94a3b8" strokeWidth="2" markerEnd="url(#arrow)" />
                <foreignObject x={mx - 10} y={my - 10} width="20" height="20" style={{ pointerEvents: 'all' }}>
                  <button onClick={() => deleteRelation(rel.id)}
                    className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 shadow">
                    <X size={10} />
                  </button>
                </foreignObject>
              </g>
            );
          })}
          <defs>
            <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" orient="auto">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#94a3b8" />
            </marker>
          </defs>
        </svg>

        {/* 사용자 카드 */}
        {users.map(u => {
          const pos = positions[u.id] || { x: 0, y: 0 };
          const isMe = u.id === user.id;
          const color = ROLE_COLORS[u.role] || '#6b7280';
          return (
            <div key={u.id}
              className={`absolute select-none cursor-grab active:cursor-grabbing rounded-xl border-2 shadow-sm px-4 py-2.5 w-[150px] text-center transition-shadow hover:shadow-md ${isMe ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'} ${linking === '__PICK_SENIOR__' ? 'cursor-pointer ring-2 ring-orange-300' : ''} ${linking && linking !== '__PICK_SENIOR__' ? 'cursor-pointer ring-2 ring-green-300' : ''}`}
              style={{ left: pos.x, top: pos.y, zIndex: dragging === u.id ? 10 : 2 }}
              onMouseDown={(e) => {
                if (linking === '__PICK_SENIOR__') { setLinking(u.id); return; }
                handleMouseDown(e, u.id);
              }}>
              <div className="text-xs px-2 py-0.5 rounded-full inline-block mb-1" style={{ backgroundColor: color + '20', color }}>{u.role}</div>
              <div className="text-sm font-semibold text-gray-800">{u.name}</div>
              {u.dept && <div className="text-xs text-gray-400">{u.dept}</div>}
              {isMe && <div className="text-[10px] text-blue-500 mt-0.5">나</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
