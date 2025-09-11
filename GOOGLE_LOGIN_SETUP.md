# Google 로그인 설정 가이드

## Firebase Console에서 Google 로그인 활성화하기

### 1단계: Firebase Console 접속
1. [Firebase Console](https://console.firebase.google.com/project/mini-game-89572)에 접속
2. 프로젝트 선택: `mini-game-89572`

### 2단계: Authentication 설정
1. 왼쪽 메뉴에서 **Authentication** 클릭
2. **Sign-in method** 탭 클릭
3. **Google** 제공업체 찾기
4. **Google** 클릭하여 설정 열기

### 3단계: Google 로그인 활성화
1. **Enable** 토글을 켜기 (ON)
2. **Project support email** 설정 (필수)
   - 예: your-email@gmail.com
3. **Save** 버튼 클릭

### 4단계: 승인된 도메인 확인
1. **Authorized domains** 섹션 확인
2. 다음 도메인들이 추가되어 있는지 확인:
   - `localhost` (개발용)
   - `mini-game-89572.firebaseapp.com` (Firebase 호스팅)
   - `your-netlify-site.netlify.app` (Netlify 배포 URL)

### 5단계: 테스트
1. 게임 페이지에서 **Google로 로그인** 버튼 클릭
2. Google 로그인 팝업이 나타나는지 확인
3. 로그인 성공 시 사용자 정보가 표시되는지 확인

## 문제 해결

### 팝업이 차단되는 경우
- 브라우저에서 팝업 허용 설정
- Chrome: 주소창 옆 팝업 차단 아이콘 클릭 → 허용

### "Google 로그인이 비활성화되어 있습니다" 오류
- Firebase Console에서 Google 로그인이 활성화되었는지 확인
- 프로젝트 지원 이메일이 설정되었는지 확인

### "Firebase Console에서 Google 로그인을 활성화해주세요" 오류
- 위의 1-3단계를 다시 확인
- 설정 저장 후 몇 분 기다린 후 다시 시도

## 추가 설정 (선택사항)

### OAuth 동의 화면 설정
1. [Google Cloud Console](https://console.cloud.google.com/) 접속
2. 프로젝트 `mini-game-89572` 선택
3. **APIs & Services** > **OAuth consent screen**
4. 앱 정보 입력:
   - 앱 이름: Lost in Ashes
   - 사용자 지원 이메일: your-email@gmail.com
   - 개발자 연락처 정보: your-email@gmail.com

### 승인된 리디렉션 URI 추가
1. **APIs & Services** > **Credentials**
2. OAuth 2.0 클라이언트 ID 클릭
3. **승인된 리디렉션 URI**에 추가:
   - `https://mini-game-89572.firebaseapp.com/__/auth/handler`
   - `https://your-netlify-site.netlify.app/__/auth/handler`
