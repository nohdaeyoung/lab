# lab — 모션 그래픽 실험 프로젝트

## 프로젝트 개요
- **경로**: `/Volumes/Dev/lab`
- **목적**: 모션 그래픽 / 크리에이티브 코딩 실험 공간
- **배포**: 정적 파일 (Cloudflare Pages or Vercel)
- **개발 서버**: `npm run dev` → localhost:5174~5175

## 기술 스택
- Vite 6 + Vanilla JS (ES Modules)
- React 사용 금지 — 순수 Canvas API + DOM
- 폰트: Noto Sans KR (본문/타이포), JetBrains Mono (라벨/코드)

## 디자인 시스템
```
배경:        #0a0a0c
텍스트:      #e8e6e1
포인트:      #c8a45c (골드)
밝은 골드:   #e8d5a3
비활성:      #252528
보더:        #1c1b18
```

## 프로젝트 구조
```
src/
├── main.js              ← 해시 라우터 + 실험 목록 (sabum.kr/lab 스타일)
├── style.css            ← 다크 테마, 목록/캔버스 레이아웃
├── experiments/         ← 각 실험 독립 파일
│   ├── 001-wave.js
│   ├── 002-scatter.js
│   ├── 003-wave.js
│   ├── 004-kinetic.js
│   ├── 005-edge-clock.js
│   └── 006-portrait.js
└── utils/
    ├── mouse.js         ← 마우스/터치 트래커 (createMouse)
    ├── text.js          ← 글자 분리(splitChars), 측정, 줄바꿈
    └── physics.js       ← lerp, spring, repel, particle, clamp
```

## 실험 파일 규격
모든 실험은 `meta`와 `init` export 필수:
```js
export const meta = {
  id: '007-myexp',     // 파일명과 일치
  title: '...',
  description: '...',
  date: 'YYYY-MM-DD',
}

export function init(canvas, ctx) {
  // canvas, ctx는 main.js가 전달
  // 반환값: destroy 함수 (cleanup)
  return function destroy() { /* RAF 취소, 이벤트 제거 */ }
}
```

## 코딩 규칙
- **배포 금지**: 변경은 로컬에만. 사용자가 "배포해줘" 할 때만 `npm run build`
- **DOM 오버레이**: Canvas 위에 DOM 쓸 때 `position: fixed; inset: 0; pointer-events: none`
- **CSS 인젝션**: 실험 내부 스타일은 `<style>` 태그 생성 후 destroy에서 제거
- **폰트 로딩**: `document.fonts.load(FONT, TEXT).then(() => draw())` 패턴 사용
- **리사이즈**: main.js가 canvas 크기 자동 관리. 실험은 `window.resize` 직접 등록

## 현재 실험 목록
| # | 파일 | 내용 |
|---|------|------|
| 001 | `001-wave.js` | 도트 그리드 + 마우스 반응 파동 (골드) |
| 002 | `002-scatter.js` | 파티클 스프링 반발 |
| 003 | `003-wave.js` | "324.ing" 텍스트 Y축 sin 파동 |
| 004 | `004-kinetic.js` | 키네틱 타이포 + 마우스 반발 + 컨트롤 패널 |
| 005 | `005-edge-clock.js` | 뷰포트 직사각형 끝단 2-링 시계 |
| 006 | `006-portrait.js` | 코드로 그린 자화상 (황금각 단어 배치) |
