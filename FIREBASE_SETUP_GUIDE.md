# Firebase 설정 가이드

## 🔥 Firebase Console 설정

### 1. Authentication 설정

#### Email/Password 로그인 활성화
1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `mini-game-89572`
3. **Authentication** > **Sign-in method** 이동
4. **Email/Password** 제공업체 클릭
5. **Enable** 토글을 켜고 **Save** 클릭

#### Google 로그인 활성화
1. **Authentication** > **Sign-in method** 이동
2. **Google** 제공업체 클릭
3. **Enable** 토글을 켜기
4. **Project support email** 설정
5. **Save** 클릭

### 2. Realtime Database 설정

#### 데이터베이스 생성
1. **Realtime Database** > **Create Database** 클릭
2. **Start in test mode** 선택 (나중에 보안 규칙 설정)
3. **Done** 클릭

#### 보안 규칙 설정
```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null && auth.uid == $uid",
        ".write": "auth != null && auth.uid == $uid"
      }
    },
    "scores": {
      ".read": true,
      ".write": "auth != null"
    }
  }
}
```

### 3. 프로젝트 설정 확인

#### 웹 앱 설정
1. **Project Settings** (⚙️) > **General** 탭
2. **Your apps** 섹션에서 웹 앱 확인
3. 설정이 올바른지 확인:
   - API Key: `AIzaSyCTudrQa8PRVV6pBkUxdUjYm-6gjy71Gcw`
   - Auth Domain: `mini-game-89572.firebaseapp.com`
   - Project ID: `mini-game-89572`
   - Database URL: `https://mini-game-89572-default-rtdb.firebaseio.com/`

## 🚨 문제 해결

### 일반적인 오류

#### `auth/configuration-not-found`
- Firebase Console에서 Authentication이 활성화되지 않음
- **해결**: Authentication > Sign-in method에서 Email/Password 활성화

#### `auth/operation-not-allowed`
- Google 로그인이 비활성화됨
- **해결**: Authentication > Sign-in method에서 Google 제공업체 활성화

#### `auth/network-request-failed`
- 네트워크 연결 문제
- **해결**: 인터넷 연결 확인, 방화벽 설정 확인

#### `auth/popup-blocked`
- 브라우저에서 팝업 차단
- **해결**: 브라우저 설정에서 팝업 허용

### 디버깅 방법

1. **브라우저 개발자 도구** 열기 (F12)
2. **Console** 탭에서 오류 메시지 확인
3. **Network** 탭에서 Firebase 요청 상태 확인
4. **Application** 탭에서 Local Storage 확인

## 📝 테스트 방법

### 1. 회원가입 테스트
1. 웹페이지에서 "회원가입" 탭 클릭
2. 사용자명, 이메일, 비밀번호 입력
3. "회원가입" 버튼 클릭
4. 성공 시 사용자 패널 표시 확인

### 2. 로그인 테스트
1. "로그인" 탭 클릭
2. 등록한 이메일과 비밀번호 입력
3. "로그인" 버튼 클릭
4. 성공 시 사용자 패널 표시 확인

### 3. Google 로그인 테스트
1. "Google로 로그인" 버튼 클릭
2. Google 계정 선택
3. 권한 승인
4. 성공 시 사용자 패널 표시 확인

## 🔧 추가 설정 (선택사항)

### Analytics 설정
- Firebase Analytics는 이미 활성화됨
- 사용자 행동 추적 및 분석 가능

### 보안 강화
- 이메일 인증 활성화
- 비밀번호 정책 설정
- 도메인 제한 설정

### 성능 최적화
- 데이터베이스 인덱스 설정
- 캐싱 정책 설정
- CDN 설정

## 📞 지원

문제가 지속되면:
1. Firebase Console에서 프로젝트 상태 확인
2. 브라우저 콘솔에서 오류 메시지 확인
3. Firebase 문서 참조: https://firebase.google.com/docs
