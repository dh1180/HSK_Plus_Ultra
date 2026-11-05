# 배포 준비 및 검증 상태

버전 0.2.0 / 2026-11-05

## 현재 결론

상용 배포 완료 상태가 아니다. 전체 콘텐츠 검수가 남아 있으며, production 빌드는 이를 통과하기 전 중단한다. QA APK는 실기기 시험용이며 스토어 배포용 서명으로 간주하면 안 된다.

## 구현

- 학습 상태 전체를 단일 v2 스냅샷으로 저장: 응답과 재출제 큐가 함께 갱신된다.
- v1 기록은 변경하지 않고 읽어 이관한다. 파싱 실패 시 원본을 보존하며 복구 화면을 제공한다.
- 앱을 닫아도 중단 세션을 이어간다. 남은 세션 종료는 이미 답한 단어 기록을 보존한다.
- JSON 백업 내보내기/불러오기, 복원 전 미리보기 및 교체 확인, 초기화 확인.
- 복원 파일 크기, 스키마, 실제 ID 범위, 응답 집계, 큐 관계를 검증한다.
- 화면 오류 복구, 중국어 음성 선택 및 오류 안내, 앱 내부 개인정보·자료 출처·문의.
- Expo SDK 58 및 호환 버전, 재현 가능한 lockfile, 높은 심각도 의존성 CI 검사.

## 콘텐츠

이번 검수 원장 `data/review/manifest.json`은 1~5급 전체 3,600개와 6급 1,190개 등 총 4,790개를 대상으로 한다. 뜻·용법·번역·병음을 AI가 항목별로 검토했다. 5급 3001~3100번은 직접 작성한 중국어 예문과 병음, 한국어 번역을 사용한다. 남은 미검수 원장 항목은 6급 610개다. 기존 일부 교정 자료를 포함한 학습 가능 단어는 4,798개이며, 표시 예문은 4,798개다. 실제 집계는 `data/content-audit.json`에서 확인한다. 客服는 공식 원문의 形을 보존하고 학습 화면에 사전 용법 기준 명사와 원문 형용사 표기를 함께 표시한다. 품사 보완도 검수 원장의 값과 달라지면 배포 검사를 통과하지 못한다.

`manifest.json`의 해시는 검토한 내용이 배포 직전 바뀌지 않았음을 검사한다. 구조 테스트와 해시 검사는 중국어의 정확성을 증명하지 않는다. 독립적인 사람의 검수나 실기기 발음 검증을 완료했다고 표시하지 않는다.

## 명령

Node.js 24:

```sh
npm ci
npm run check
npm run release:report
npm audit --audit-level=high
npm run restore:icon
npx expo export --platform web --output-dir dist
npx playwright install --with-deps chromium
npm run test:browser
```

공개 전 `npm run release:check`를 실행한다. 현재는 미검수 610개 때문에 실패하는 것이 정상이다. QA 검사 실패를 숨기기 위해 이 검사를 제거하지 않는다.

## Android

GitHub QA 빌드는 실행기에 설치된 NDK 27.3.13750724를 명시해 사용한다. Expo 기본 NDK 27.1.12297006의 자동 다운로드에서 손상된 ZIP 오류가 발생한 데 따른 CI 설정이다. EAS의 기본 NDK와 구분하며 실제 배포 바이너리도 별도로 시험해야 한다.

1. GitHub PR에서 App checks 및 Build Android APK 확인. artifact `HSK-Plus-Ultra-QA-APK`를 시험 기기에 설치한다. 이전 QA 앱과 서명 키가 다르면 업데이트 설치가 거부될 수 있으므로 먼저 기록을 백업한다.
2. 실제 기기에서 아래 체크리스트를 수행하고 기기·OS·결과를 기록한다.
3. 전체 콘텐츠를 검수 원장에 반영하고 release 검사를 통과한다.
4. 운영자의 Expo 계정에서 `eas init`으로 프로젝트를 연결한다. 기존 프로젝트 ID를 알고 있다고 가정하거나 임의로 생성하지 않았다.
5. 운영자가 소유한 앱 서명을 EAS credentials로 관리한 뒤 `eas build --platform android --profile production`을 실행한다. `eas-build-post-install`은 production 프로필에서 콘텐츠 및 앱 검사를 수행한다.
6. Google Play 내부 테스트에 AAB를 올린다. 스토어에 등록한 applicationId, versionCode, 업로드 키, 개인정보 공개 페이지, 문의 연락처, 대상 연령, 콘텐츠 등급, 데이터 보안 정보를 확인한다.

Google Play에 제출·공개한 적 없으며 production 서명 키를 만들거나 저장소에 넣지 않았다. EAS 인증과 Play Console의 계정·운영자 정보는 운영자 설정이 필요하다. iOS는 별도 macOS/Xcode 빌드 및 Apple 계정으로 시험해야 한다.

## 실기기 필수 확인 (미수행)

- [ ] 새 설치와 기존 v1 기록이 있는 앱의 업데이트 설치
- [ ] 중국어 음성 설치/미설치, 무음 모드, 오프라인에서 음성 재생
- [ ] 다독음자(得 dé/děi/de, 行 xíng/háng 등)의 표시 병음과 실제 소리
- [ ] 재학습 중 강제 종료 후 다시 열기, 백그라운드 복귀
- [ ] 백업을 파일 앱에 저장하고 다른 설치에서 복원, 취소 및 잘못된 파일
- [ ] Android 뒤로가기, 노치·제스처 내비게이션, 큰 글자, 스크린리더
- [ ] 저장 공간 부족 시 오류 후 재시도, 삭제 후 데이터 유무
- [ ] 공개 개인정보 URL 및 운영자 연락처를 스토어에서 확인

## 참고

- https://docs.expo.dev/workflow/upgrading-expo-sdk-walkthrough/
- https://docs.expo.dev/deploy/build-project/
- https://support.google.com/googleplay/android-developer/answer/9859455
