# HSK Plus Ultra

HSK 3.0 어휘를 **필요한 시점에 다시 보여주는 모바일 단어 학습 앱**입니다.

JLPT 단어 학습 앱에서 느낀 단순한 사용 흐름을 참고하되, HSK에 맞게 병음·중국어 발음·한국어 뜻 중심으로 새로 구성했습니다.

## 현재 구현된 기능

- HSK 1~6 급수 선택 홈
- 급수별 신규/누적 어휘 수 표시
- 오늘의 학습량 10 / 20 / 30개 선택
- 복습 단어 우선 + 남는 학습량을 새 단어로 자동 구성
- 중국어 단어 / 병음 / 한국어 뜻 / 일부 예문 카드
- `expo-speech` 기반 중국어 TTS
- `알고 있음` / `다시 학습` 판정
- 학습 진행 상황 기기 로컬 저장
- 학습 종료 결과 화면
- 공식 HSK 3.0 어휘 메타데이터 동기화 스크립트

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

Node.js 22.13 이상 권장. 현재 프로젝트는 Expo SDK 57 / React Native 0.86 기준입니다.

```bash
git clone https://github.com/dh1180/HSK_Plus_Ultra.git
cd HSK_Plus_Ultra
npm install
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

현재 앱에는 화면과 학습 로직을 바로 테스트할 수 있도록 HSK 1~6의 **한국어 스타터 어휘**가 들어 있습니다.

전체 HSK 1~6 공식 어휘 메타데이터를 받아 확인하려면:

```bash
npm run sync:hsk
```

실행 후 `src/data/generated-hsk.json`이 생성됩니다. 이 파일은 용량 때문에 Git에 커밋하지 않도록 설정되어 있습니다.

동기화 데이터에는 다음이 포함됩니다.

```json
{
  "id": "hsk1-0001",
  "level": 1,
  "sourceWord": "爱",
  "word": "爱",
  "pinyin": "ài",
  "partOfSpeechZh": "动",
  "sort": 1,
  "levelName": "一级"
}
```

한국어 뜻과 예문은 상용 사전을 크롤링하지 않고 프로젝트에서 별도로 검수해 채우는 방향입니다.

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

## 다음 개발 순서

1. HSK 1 한국어 뜻·예문 전체 검수
2. HSK 2~6 데이터 확장
3. 전체 단어 검색 / 장기 기억 목록 / 복습 예정 목록 화면 분리
4. 듣기 퀴즈와 성조 퀴즈
5. 로그인 및 클라우드 동기화
6. HSK 7~9 고급 모드
