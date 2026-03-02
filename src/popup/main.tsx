import '../polyfills/process';
import React from 'react';
import { createRoot } from 'react-dom/client';
import './popup.css';

function PopupApp() {
  const openEcampus = async (forceNewTab = false) => {
    const url = 'https://ecampus.smu.ac.kr/';
    const [tab] = forceNewTab ? [] : await chrome.tabs.query({ active: true, currentWindow: true });

    if (!forceNewTab && tab?.id) {
      await chrome.tabs.update(tab.id, { url });
    } else {
      await chrome.tabs.create({ url });
    }

    window.close();
  };

  return (
    <main className="popup-shell">
      <header className="popup-hero">
        <p className="popup-kicker">SMU Extension</p>
        <h1 className="popup-title">eCampus Dashboard</h1>
        <p className="popup-description">과목별 과제, 강의, 공지를 한 화면에서 빠르게 확인하세요.</p>
      </header>

      <section className="popup-panel">
        <div className="popup-meta-row">
          <span className="popup-chip">학습 관리</span>
          <span className="popup-chip popup-chip-accent">원클릭 이동</span>
        </div>

        <button
          type="button"
          className="popup-btn popup-btn-primary"
          onClick={() => {
            void openEcampus();
          }}
        >
          현재 탭에서 eCampus 열기
        </button>

        <button
          type="button"
          className="popup-btn popup-btn-secondary"
          onClick={() => {
            void openEcampus(true);
          }}
        >
          새 탭에서 열기
        </button>

        <p className="popup-footnote">eCampus 페이지에서 우측 상단 패널이 자동으로 표시됩니다.</p>
      </section>
    </main>
  );
}

const rootEl = document.getElementById('popup-root');
if (rootEl) {
  createRoot(rootEl).render(<PopupApp />);
}
