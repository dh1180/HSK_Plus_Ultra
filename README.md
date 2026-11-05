# HSK Plus Ultra

HSK 3.0 어휘를 **필요한 시점에 다시 보여주는 모바일 단어 학습 앱**입니다.

JLPT 단어 학습 앱에서 느낀 단순한 사용 흐름을 참고하되, HSK에 맞게 병음·중국어 발음·한국어 뜻 중심으로 새로 구성했습니다.

## 현재 구현된 기능

- HSK 1~6 급수 선택 홈
- 급수별 신규/누적 어휘 수 표시
- 한 번에 학습할 단어 수 10 / 20 / 30개 선택
- 복습 단어 우선 + 남는 학습량을 새 단어로 자동 구성
- 중국어 단어 / 병음 / 한국어 뜻 / 작성·교정 예문 카드
- `expo-speech` 기반 중국어 TTS
- `알고 있음` / `다시 학습` 판정
- 학습 진행 상황 기기 로컬 저장
- 학습 종료 결과 화면
- HSK 3.0 어휘 메타데이터 동기화 스크립트
- 전체 범위 한자·병음·한국어 검색 및 목록 50개씩 더 보기
- 뜻 검토 상태 표시와 미검수 학습 콘텐츠 격리
- 저장 실패 안내 및 재시도
- 중단한 세션 이어하기, 기록 JSON 백업·복원, 확인 후 초기화
- 설정·개인정보·출처·문의, 오류 복구 화면

## 핵심 복습 로직

```text
30분 → 3일 → 7일 → 21일 → 장기 기억
```

일반 단어는 `알고 있음`이면 한 단계 올라가고 `다시 학습`이면 한 단계 내려갑니다.

| 현재 상태 | 알고 있음 | 다시 학습 |
|---|---|---|
| 새 단어 | 장기 기억 | 3일 |
| 30분 | 3일 | 30분 |
| 3일 | 7일 | 30분 |
| 7일 | 21일 | 3일 |
| 21일 | 장기 기억 | 7일 |
| 장기 기억 | 장기 기억 | 7일 |

`새 단어`는 특수 상태입니다. 처음 본 순간 이미 아는 단어라면 장기 기억으로 바로 들어가고, 모르는 단어라면 3일 단계부터 시작합니다.

## 실행

Node.js 24를 사용합니다. Expo SDK 58 / React Native 0.88 기준입니다.

```bash
git clone https://github.com/dh1180/HSK_Plus_Ultra.git
cd HSK_Plus_Ultra
npm ci
npm run restore:icon
npx expo start
```

이후 터미널에서:

- `a` — Android
- `i` — iOS (macOS 필요)
- `w` — Web
- Expo Go 앱으로 QR 스캔 — 실제 휴대폰 테스트

직접 명령어를 사용해도 됩니다.

```bash
npm run android
npm run ios
npm run web
```

## HSK 어휘 데이터

단어·급수·병음·품사는 공식 HSK 시험 대강 PDF의 5,400개 항목과 직접 대조했습니다. 기존 ID를 보존하고 공식 순번·페이지를 연결했습니다. 각 학습 카드의 ‘공식 어휘 원문 보기’로 원문을 열 수 있습니다. **한국어 뜻과 예문이 공식 자료라는 뜻은 아닙니다.**

HSK 1~6급 5,400개 전체를 검색하고 학습할 수 있습니다. AI가 각 항목의 한국어 뜻·용법·중국어 예문·번역·병음을 검토했습니다. 공식 표기와 학습용 보완이 다른 항목은 원문 정보도 함께 표시합니다.

검수 기록은 `data/review/manifest.json`에 있습니다. `npm run release:check`는 검수 누락과 검수 후 내용 변경을 탐지합니다.

**상용 배포 완료 상태가 아닙니다.** 구현과 남은 배포 요건은 [배포 준비 문서](docs/RELEASE.md), [개인정보 안내](docs/PRIVACY.md)를 참고하세요.

어휘 스냅샷 `src/data/generated-hsk.json`은 Git에 포함되어 있습니다. 빌드는 이 스냅샷을 사용하며 원격 자료를 자동 갱신하지 않습니다.

```bash
npm run check                      # 타입·회귀 테스트·전체 구조 검사
npx expo export --platform web
npx playwright install chromium
npm run test:browser               # 웹 화면 조작 검사
npm run audit:content -- --write    # 점검 결과 재생성
python3 -m pip install -r requirements-content.txt
npm run sync:hsk                    # 고정된 공식 PDF와 대조하여 메타데이터 갱신
```

같은 ID의 단어·병음·급수가 바뀌면 동기화를 중단합니다. 먼저 학습 기록 이관과 `content-overrides.json`의 연결을 검토하세요. 생성 워크플로는 수동 실행하며 검토용 artifact만 만듭니다. 생성 결과를 그대로 런타임에 넣지 마세요.

뜻·예문 교정은 `content-overrides.json`에 ID별 표제어·병음·뜻·중국어 예문·문장 병음·한국어 번역을 함께 작성합니다. `npm run check`는 연결과 누락을 확인하지만 자연스러운 용법과 번역 정확성을 인증하지는 않습니다.

### HSK 3.0 어휘 수

현재 사용하는 HSK 3.0 syllabus 데이터 기준:

| 급수 | 이 급수까지 누적 | 해당 급수 신규 |
|---|---:|---:|
| HSK 1 | 300 | 300 |
| HSK 2 | 500 | 200 |
| HSK 3 | 1,000 | 500 |
| HSK 4 | 2,000 | 1,000 |
| HSK 5 | 3,600 | 1,600 |
| HSK 6 | 5,400 | 1,800 |

HSK 7~9는 다음 단계에서 별도 고급 학습 모드로 확장할 예정입니다.

## 프로젝트 구조

```text
HSK_Plus_Ultra/
├── App.tsx
├── src/
│   ├── data/
│   │   └── vocabulary.ts
│   ├── lib/
│   │   ├── srs.ts
│   │   ├── storage.ts
│   │   └── study.ts
│   ├── screens/
│   │   ├── HomeScreen.tsx
│   │   ├── LevelScreen.tsx
│   │   ├── StudyScreen.tsx
│   │   └── SummaryScreen.tsx
│   ├── theme.ts
│   └── types.ts
├── scripts/
│   └── sync-hsk.mjs
└── data/
    └── ATTRIBUTION.md
```

## 데이터 출처

구조화 데이터: https://github.com/profesorm/hsk30  
공식 HSK 출처: https://www.chinesetest.cn/

자세한 내용은 `data/ATTRIBUTION.md`를 참고하세요.

## 배포 전 남은 작업

- Android 실기기 설치·업데이트·TTS·백업 파일 조작 검증
- 운영자 소유 서명과 Expo/스토어 계정 연결
- 개인정보 안내 공개 웹 페이지 게시 및 스토어 등록 정보 확인

세부 체크리스트와 production AAB 빌드는 [배포 문서](docs/RELEASE.md)를 따릅니다.

한 세션의 재출제에서 `알고 있음`은 단계를 올리지 않고 기존 예약을 유지합니다. `다시 학습`은 한 단계 더 내립니다. 결과의 학습 단어 수와 응답 횟수는 구분합니다. 장기 기억 표시는 사용자의 자기 평가에 따른 분류이며, 실제 기억이 검증됐다는 의미는 아닙니다.
