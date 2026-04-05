import { useState } from 'react';
import { BookOpen, ChevronRight, ChevronLeft, HelpCircle } from 'lucide-react';

const MANUAL_SECTIONS = [
  {
    title: '시작하기',
    items: [
      { q: '회원가입', a: '이름, 이메일, 비밀번호, 직급을 입력하여 가입합니다. 부서는 선택사항입니다.' },
      { q: '로그인', a: '등록한 이메일과 비밀번호로 로그인합니다.' },
    ]
  },
  {
    title: '조직도',
    items: [
      { q: '구성원 배치', a: '카드를 드래그하여 원하는 위치로 이동합니다. "위치 저장" 버튼을 눌러 저장합니다.' },
      { q: '관계 연결', a: '"관계 연결" 버튼 → 선임 클릭 → 후임 클릭으로 상하관계를 설정합니다.' },
      { q: '관계 삭제', a: '연결 라인 중간의 × 버튼을 클릭하여 삭제합니다.' },
    ]
  },
  {
    title: '업무 관리',
    items: [
      { q: '지시사항', a: '선임이 후임에게 업무를 지시합니다. 대상자는 후임 목록에서만 선택 가능합니다.' },
      { q: '보고사항', a: '후임이 선임에게 업무를 보고합니다. 대상자는 선임 목록에서만 선택 가능합니다.' },
      { q: '공유사항', a: '관계 무관하게 모든 구성원에게 공유합니다.' },
      { q: '완료 처리', a: '체크 버튼을 클릭하면 완료/미완료로 토글됩니다. 완료일이 자동 기록됩니다.' },
      { q: '삭제', a: '작성자만 업무를 삭제할 수 있습니다.' },
    ]
  },
  {
    title: '대시보드',
    items: [
      { q: '달성률', a: '일간/주간/월간 기간별로 전체 달성률, 지시 수행률, 보고 제출률을 확인합니다.' },
      { q: '후임 현황', a: '선임 입장에서 후임별 달성률을 일괄 확인합니다.' },
    ]
  },
  {
    title: '문서 출력',
    items: [
      { q: 'Word 다운로드', a: '업무 목록을 A4 Word 문서로 다운로드합니다.' },
      { q: 'Excel 다운로드', a: '업무 목록을 A4 Excel 파일로 다운로드합니다.' },
      { q: '달성률 엑셀', a: '대시보드에서 달성률 보고서를 Excel로 다운로드합니다.' },
    ]
  },
  {
    title: '이메일 알림',
    items: [
      { q: '자동 발송', a: '지시사항이나 보고사항 등록 시, 대상자의 등록 이메일로 업무 알림이 자동 발송됩니다.' },
      { q: 'SMTP 설정', a: '관리자가 서버 환경변수(SMTP_HOST, SMTP_USER, SMTP_PASS)를 설정하면 활성화됩니다.' },
    ]
  },
  {
    title: '모바일 앱',
    items: [
      { q: '앱 설치', a: '브라우저 메뉴에서 "홈 화면에 추가" 또는 "앱 설치"를 선택하면 PWA 앱으로 설치됩니다.' },
      { q: '오프라인', a: 'PWA로 설치하면 일부 기능을 오프라인에서도 사용할 수 있습니다.' },
    ]
  }
];

export default function ManualPanel() {
  const [open, setOpen] = useState(false);
  const [expandedSection, setExpandedSection] = useState(null);

  return (
    <>
      {/* 토글 버튼 */}
      <button onClick={() => setOpen(!open)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-blue-600 text-white p-2 rounded-l-lg shadow-lg hover:bg-blue-700 transition">
        {open ? <ChevronRight size={20} /> : <div className="flex flex-col items-center gap-1"><BookOpen size={18} /><span className="text-[10px] writing-vertical">매뉴얼</span></div>}
      </button>

      {/* 패널 */}
      <div className={`fixed right-0 top-0 h-full w-80 bg-white shadow-2xl z-30 transform transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="bg-blue-600 text-white p-4">
          <div className="flex items-center gap-2">
            <BookOpen size={20} />
            <h2 className="font-bold text-lg">사용 매뉴얼</h2>
          </div>
          <p className="text-blue-200 text-xs mt-1">WorkHive 사용 가이드</p>
        </div>

        <div className="overflow-y-auto h-[calc(100%-80px)] p-4 space-y-2">
          {MANUAL_SECTIONS.map((section, si) => (
            <div key={si} className="border border-gray-100 rounded-lg overflow-hidden">
              <button onClick={() => setExpandedSection(expandedSection === si ? null : si)}
                className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition">
                <span>{section.title}</span>
                <ChevronRight size={14} className={`transform transition ${expandedSection === si ? 'rotate-90' : ''}`} />
              </button>
              {expandedSection === si && (
                <div className="px-3 pb-3 space-y-2">
                  {section.items.map((item, ii) => (
                    <div key={ii} className="bg-gray-50 rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <HelpCircle size={14} className="text-blue-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-700">{item.q}</p>
                          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{item.a}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
