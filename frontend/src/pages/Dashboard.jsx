import { useState, useEffect } from 'react';
import { BarChart3, CheckCircle2, FileText, Users, Download } from 'lucide-react';
import api from '../api';
import { useAuth } from '../AuthContext';

const TYPE_LABELS = { inst: '지시사항', rep: '보고사항', shared: '공유사항' };
const STATUS_COLORS = { pending: 'bg-amber-100 text-amber-700', done: 'bg-green-100 text-green-700' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState('monthly');

  useEffect(() => {
    api.get(`/tasks/stats?period=${period}`).then(r => setStats(r.data)).catch(console.error);
  }, [period]);

  const downloadStatsExcel = () => {
    api.get('/export/stats-excel', { responseType: 'blob' }).then(r => {
      const url = URL.createObjectURL(r.data);
      const a = document.createElement('a'); a.href = url;
      a.download = `WorkHive_Stats_${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click(); URL.revokeObjectURL(url);
    });
  };

  if (!stats) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

  const cards = [
    { label: '전체 달성률', data: stats.overall, icon: BarChart3, iconCls: 'text-blue-500', numCls: 'text-blue-600', barCls: 'bg-blue-500' },
    { label: '지시 수행률', data: stats.instruction, icon: CheckCircle2, iconCls: 'text-emerald-500', numCls: 'text-emerald-600', barCls: 'bg-emerald-500' },
    { label: '보고 제출률', data: stats.report, icon: FileText, iconCls: 'text-violet-500', numCls: 'text-violet-600', barCls: 'bg-violet-500' },
  ];

  return (
    <div className="space-y-6">
      {/* 기간 탭 + 다운로드 */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[['daily','일간'],['weekly','주간'],['monthly','월간']].map(([k,v]) => (
            <button key={k} onClick={() => setPeriod(k)}
              className={`px-4 py-1.5 text-sm rounded-md transition ${period === k ? 'bg-white shadow text-blue-600 font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {v}
            </button>
          ))}
        </div>
        <button onClick={downloadStatsExcel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition">
          <Download size={14} /> 달성률 엑셀
        </button>
      </div>

      {/* 달성률 카드 3개 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(({ label, data, icon: Icon, iconCls, numCls, barCls }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-gray-500">{label}</span>
              <Icon size={18} className={iconCls} />
            </div>
            <div className={`text-3xl font-bold ${numCls} mb-2`}>{data.rate}%</div>
            <div className="w-full bg-gray-100 rounded-full h-2">
              <div className={`${barCls} h-2 rounded-full transition-all duration-500`}
                style={{ width: `${data.rate}%` }}></div>
            </div>
            <div className="text-xs text-gray-400 mt-2">{data.done} / {data.total}건 완료</div>
          </div>
        ))}
      </div>

      {/* 후임 달성 현황 */}
      {stats.juniorStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Users size={18} className="text-blue-500" />
            <h3 className="font-semibold text-gray-800">후임 달성 현황</h3>
          </div>
          <div className="space-y-3">
            {stats.juniorStats.map(j => (
              <div key={j.id} className="flex items-center gap-3">
                <div className="w-24 text-sm font-medium text-gray-700 truncate">{j.name} <span className="text-gray-400 text-xs">{j.role}</span></div>
                <div className="flex-1 bg-gray-100 rounded-full h-2.5">
                  <div className="bg-blue-500 h-2.5 rounded-full transition-all" style={{ width: `${j.rate}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-600 w-12 text-right">{j.rate}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 최근 업무 피드 */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4">최근 업무</h3>
        {stats.recentTasks.length === 0 ? (
          <p className="text-gray-400 text-sm text-center py-4">등록된 업무가 없습니다</p>
        ) : (
          <div className="space-y-2">
            {stats.recentTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition">
                <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[t.status]}`}>
                  {t.status === 'done' ? '완료' : '진행중'}
                </span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{TYPE_LABELS[t.type]}</span>
                <span className="text-sm text-gray-800 flex-1 truncate">{t.title}</span>
                <span className="text-xs text-gray-400">{(t.created_at || '').slice(0, 10)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
