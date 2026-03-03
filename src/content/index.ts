// 콘텐츠 스크립트 진입점: 모듈 초기화 순서를 고정해 부작용 기반 API를 등록한다.
import '../polyfills/process';
import './styles/content.css';

import './modules/school.adapter';
import './modules/school.adapter.smu';
import './modules/shared';
import './modules/vod';
import './modules/vod.panel';
import './modules/crawler.course';
import './modules/crawler';
import './modules/crawler.meta';
import './modules/crawler.activity';
import './modules/crawler.report';
import './modules/crawler.lecture.vod';
import './modules/crawler.lecture';
import './modules/crawler.enrich';
import './modules/crawler.dedupe';
import './modules/crawler.course-items';
import './modules/crawler.progress-page';
import './modules/crawler.dashboard';
import './modules/crawler.notice';
import './ui/installReactUi';
import './bootstrap';
