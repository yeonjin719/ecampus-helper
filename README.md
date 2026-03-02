# SMU eCampus Dashboard (React + TypeScript + Tailwind)

SMU eCampus 대시보드에서 과목별 활동(과제/강의/토론/자료/공지)을 수집해 우측 패널에 표시하는 Chrome Extension입니다.

## Tech Stack

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Chrome Extension Manifest V3

## 개발 환경 실행

```bash
npm install
npm run dev
```

`npm run dev`는 content script를 watch 빌드합니다.  
팝업까지 watch하려면 별도 터미널에서 `npm run dev:popup`을 함께 실행하세요.

## 빌드

```bash
npm run build
```

빌드 결과물은 `dist/`에 생성되며, `manifest.json`도 함께 복사됩니다.

## 확장 프로그램 로드

1. 크롬에서 `chrome://extensions` 접속
2. 개발자 모드 ON
3. `압축해제된 확장 프로그램 로드` 클릭
4. `dist/` 폴더 선택

## 주요 구조

- `src/content/index.ts`: 콘텐츠 스크립트 엔트리
- `src/content/ui/installReactUi.tsx`: 사이드바 React UI 레이어
- `src/content/modules/*`: 기존 크롤러/VOD 로직의 TS 이관 모듈
- `src/content/bootstrap.ts`: 크롤링 오케스트레이션
- `src/popup/main.tsx`: 확장 팝업 UI
- `src/content/styles/content.css`: Tailwind + VOD 패널 스타일

## 동작 개요

1. 대시보드에서 과목 목록 수집
2. 과목 페이지를 `fetch + DOMParser`로 크롤링
3. 통합 아이템 배열을 `chrome.storage.local`에 캐시
4. React 사이드바에서 필터/과목탭/설정 기반으로 렌더링
