// @ts-nocheck
(() => {
    // 크롤러 전역 상태만 초기화한다. 실제 로직은 분리 모듈에서 등록된다.
    const E = window.__ECDASH__;
    E.reportPathSupport = E.reportPathSupport || {
        progress: false,
        completion: false,
    };
})();
