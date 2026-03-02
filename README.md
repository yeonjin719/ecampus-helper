# SMU eCampus Dashboard

SMU eCampus 페이지에서 과목별 학습 항목(과제/강의/토론/자료/공지)을 한눈에 관리할 수 있도록 우측 대시보드 패널과 VOD 보조 기능을 제공하는 Chrome Extension입니다.

## 주요 기능

- 과목별 항목 집계 및 그룹 렌더링
- 마감/유형/과목 필터링
- 지난 강의/과제/토론 숨김 설정
- 항목 단위 숨김 및 설정 모달에서 상세 복원
- 자료/영상 다운로드(Chrome `downloads` API 기반)
- VOD 페이지 재생 컨트롤(배속, 시킹, 다운로드)
- 팝업에서 eCampus 원클릭 이동

## 기술 스택

- React 18
- TypeScript
- Tailwind CSS
- Vite
- Chrome Extension Manifest V3

## 권한(Manifest)

- `storage`: UI 상태/설정 저장
- `tabs`: 팝업에서 eCampus 탭 이동
- `downloads`: 자료/영상 파일 다운로드
- `host_permissions`: `https://ecampus.smu.ac.kr/*`

## 프로젝트 구조

```text
src/
  background/                  # background service worker (다운로드 처리)
  content/
    bootstrap.ts               # 크롤링/렌더링 오케스트레이션
    index.ts                   # content script 진입점
    modules/                   # 크롤러 + VOD 기능 모듈
      school.adapter.ts        # 학교 어댑터 레지스트리/공통 래퍼
      school.adapter.smu.ts    # SMU 어댑터 등록
    styles/content.css         # content 영역 스타일
    ui/
      installReactUi.tsx       # React UI 마운트 및 상태 동기화
      components/              # 대시보드 UI 컴포넌트
  popup/
    main.tsx                   # 확장 팝업 UI
scripts/
  write-dist-manifest.mjs      # dist용 manifest 경로 정규화
```

## 개발 방법

### 1) 설치

```bash
npm install
```

### 2) Watch 빌드

각 타깃은 별도 watch 프로세스로 관리합니다.

```bash
npm run dev:content
npm run dev:background
npm run dev:popup
```

`npm run dev`는 `dev:content`와 동일합니다.

### 3) 타입 체크

```bash
npm run typecheck
```

## 배포용 빌드

```bash
npm run build
```

빌드 결과:

- `dist/content.js`, `dist/content.css`
- `dist/background.js`
- `dist/popup.html`, `dist/assets/*`
- `dist/manifest.json`

## 크롬에서 로드

1. `chrome://extensions` 진입
2. 개발자 모드 활성화
3. `압축해제된 확장 프로그램 로드` 선택
4. 프로젝트의 `dist/` 폴더 선택

코드 수정 후에는 빌드 + 확장프로그램 `새로고침`을 수행해야 변경이 반영됩니다.

## 로고(아이콘) 적용

1. 아이콘 파일 준비: `16/32/48/128` 사이즈 PNG
2. 예시 경로: `public/icons/icon16.png` 등
3. `manifest.json`의 `icons`, `action.default_icon`에 경로 추가
4. `npm run build` 후 확장프로그램 재로드

## 동작 흐름

1. content script가 eCampus 페이지에서 데이터 수집 시작
2. 크롤러가 과목/항목 데이터를 정규화
3. React UI가 `chrome.storage.local` 기반 상태와 함께 렌더링
4. 다운로드 요청은 content -> background message -> `chrome.downloads.download` 경로로 처리

## 다른 학교 확장 방법

1. `src/content/modules/school.adapter.{학교}.ts` 파일을 추가합니다.
2. `registerSchoolAdapter`로 아래 핸들러를 구현합니다.
   - `match`
   - `isDashboardPage`
   - `collectDashboardCourses`
   - `crawlAllDashboardItems`
   - `getCurrentCourse`
   - `isProgressPage` (선택)
   - `collectProgressPageItems` (선택)
3. `src/content/index.ts`에 새 어댑터 모듈을 import 합니다.
4. 필요 시 `manifest.json`의 `host_permissions`를 학교 도메인으로 확장합니다.

## 문제 해결

- 다운로드 버튼 클릭 시 새 탭만 열리면:
  - 최신 빌드(`npm run build`) 후 확장프로그램을 재로드했는지 확인
  - `downloads` 권한이 반영된 `dist/manifest.json`으로 로드됐는지 확인
- UI가 갱신되지 않으면:
  - `dist/`를 다시 빌드하고 확장프로그램 새로고침

## 라이선스

MIT License ([LICENSE](/Users/kim-yeonjin/Documents/project/ecampus-dashboard-smu/LICENSE))
