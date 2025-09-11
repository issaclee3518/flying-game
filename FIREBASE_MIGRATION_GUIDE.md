# Firebase 마이그레이션 가이드

## 개요
이 프로젝트는 MongoDB에서 Firebase로 성공적으로 마이그레이션되었습니다.

## 변경 사항

### 1. 의존성 변경
- **제거된 패키지**: `mongoose`, `bcryptjs`
- **추가된 패키지**: `firebase`, `firebase-admin`

### 2. 인증 시스템 변경
- **이전**: JWT + bcrypt + MongoDB
- **현재**: Firebase Authentication + JWT (선택적)

### 3. 데이터베이스 변경
- **이전**: MongoDB with Mongoose
- **현재**: Firestore

### 4. 클라이언트 사이드 변경
- Firebase SDK를 통한 직접 인증
- Firestore를 통한 실시간 데이터 동기화

## 설정 방법

### 1. Firebase 프로젝트 생성
1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication 활성화 (이메일/비밀번호 방식)
3. Firestore Database 생성
4. 웹 앱 등록

### 2. 환경 변수 설정
`.env` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Firebase 설정
FIREBASE_API_KEY=AIzaSyCTudrQa8PRVV6pBkUxdUjYm-6gjy71Gcw
FIREBASE_AUTH_DOMAIN=mini-game-89572.firebaseapp.com
FIREBASE_PROJECT_ID=mini-game-89572
FIREBASE_STORAGE_BUCKET=mini-game-89572.firebasestorage.app
FIREBASE_MESSAGING_SENDER_ID=439863312866
FIREBASE_APP_ID=1:439863312866:web:636bde51bf5c75d84a79bb
FIREBASE_MEASUREMENT_ID=G-D3KMQWRPKK

# Firebase Admin SDK (서버 사이드용)
FIREBASE_PRIVATE_KEY_ID=your-private-key-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@mini-game-89572.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your-client-id
FIREBASE_CLIENT_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40mini-game-89572.iam.gserviceaccount.com

# JWT Secret (기존)
JWT_SECRET=your-secret-key-change-this-in-production

# 서버 포트
PORT=9000
```

### 3. Firebase Admin SDK 설정
1. Firebase Console > 프로젝트 설정 > 서비스 계정
2. "새 비공개 키 생성" 클릭
3. 다운로드된 JSON 파일의 내용을 환경 변수에 설정

### 4. Firestore 보안 규칙 설정
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서 - 본인만 읽기/쓰기 가능
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 점수 문서 - 인증된 사용자만 쓰기 가능, 모든 사용자 읽기 가능
    match /scores/{scoreId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 데이터 구조

### Firestore 컬렉션

#### users 컬렉션
```javascript
{
  username: string,
  email: string,
  bestScore: number,
  totalGames: number,
  createdAt: timestamp
}
```

#### scores 컬렉션
```javascript
{
  userId: string,
  username: string,
  score: number,
  level: number,
  gameDate: timestamp
}
```

## API 엔드포인트

### 인증
- `POST /api/register` - 회원가입 (이메일/비밀번호)
- `POST /api/login` - 로그인 (이메일/비밀번호)
- `GET /api/verify` - 토큰 검증

### 점수 관리
- `POST /api/scores` - 점수 저장
- `GET /api/scores/best` - 최고 점수 조회
- `GET /api/scores/leaderboard` - 랭킹 조회
- `GET /api/scores/history` - 점수 히스토리
- `GET /api/stats` - 사용자 통계

## 클라이언트 사이드 사용법

### Firebase 초기화
```javascript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
```

### 인증 사용
```javascript
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';

// 로그인
const userCredential = await signInWithEmailAndPassword(auth, email, password);

// 회원가입
const userCredential = await createUserWithEmailAndPassword(auth, email, password);
```

### Firestore 사용
```javascript
import { doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';

// 데이터 읽기
const userDoc = await getDoc(doc(db, 'users', userId));

// 데이터 쓰기
await setDoc(doc(db, 'users', userId), userData);

// 쿼리
const q = query(collection(db, 'users'), orderBy('bestScore', 'desc'), limit(10));
const snapshot = await getDocs(q);
```

### Analytics 사용
```javascript
import { logEvent } from 'firebase/analytics';

// 사용자 로그인 이벤트
logEvent(analytics, 'login', {
  method: 'email'
});

// 회원가입 이벤트
logEvent(analytics, 'sign_up', {
  method: 'email'
});

// 점수 달성 이벤트
logEvent(analytics, 'score_achievement', {
  score: 1000,
  is_new_record: true
});

// 로그아웃 이벤트
logEvent(analytics, 'logout');
```

## 배포

### Netlify Functions
Netlify Functions는 Firebase Admin SDK를 사용하여 서버 사이드 작업을 처리합니다.

### 환경 변수 설정
Netlify 대시보드에서 환경 변수를 설정하세요:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_PRIVATE_KEY`
- `FIREBASE_CLIENT_EMAIL`
- `JWT_SECRET`

## 장점

1. **실시간 동기화**: Firestore의 실시간 리스너를 통한 자동 업데이트
2. **확장성**: Firebase의 자동 확장 기능
3. **보안**: Firebase의 내장 보안 기능
4. **간편한 인증**: Firebase Authentication의 다양한 인증 방식
5. **오프라인 지원**: Firestore의 오프라인 캐싱

## 주의사항

1. **비용**: Firestore는 사용량에 따라 과금됩니다
2. **쿼리 제한**: Firestore는 복잡한 쿼리에 제한이 있습니다
3. **인덱스**: 복합 쿼리를 위해서는 인덱스가 필요할 수 있습니다

## 문제 해결

### 일반적인 오류
1. **Firebase 초기화 오류**: 환경 변수 확인
2. **권한 오류**: Firestore 보안 규칙 확인
3. **인증 오류**: Firebase Authentication 설정 확인

### 디버깅
- Firebase Console에서 실시간 로그 확인
- 브라우저 개발자 도구에서 네트워크 탭 확인
- Firestore 데이터 확인
