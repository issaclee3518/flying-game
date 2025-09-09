# 🚁 사막 비행 게임

사막을 배경으로 한 캐릭터 비행 게임입니다. 사용자 인증 시스템과 점수 저장 기능이 포함되어 있습니다.

## 🎮 게임 특징

- **사막 테마**: 선인장, 새, 구름이 있는 사막 배경
- **다양한 장애물**: 바닥의 선인장, 날아다니는 새들
- **구름 시스템**: 구름에 닿으면 안개 효과, 1.5초 이상 있으면 게임 오버
- **무적 아이템**: 3초간 무적 상태가 되는 별 아이템
- **사용자 인증**: 회원가입/로그인 시스템
- **점수 저장**: 최고 점수 기록 및 랭킹 시스템

## 🎯 게임 조작법

- **스페이스바** 또는 **마우스 클릭**: 캐릭터 상승
- **버튼을 놓으면**: 캐릭터 하강
- **R키** 또는 **다시 시작하기 버튼**: 게임 재시작

## 🚀 설치 및 실행

### 1. Node.js 설치
Node.js가 설치되어 있지 않다면 [Node.js 공식 사이트](https://nodejs.org/)에서 다운로드하여 설치하세요.

### 2. MongoDB 설치
MongoDB가 설치되어 있지 않다면 [MongoDB 공식 사이트](https://www.mongodb.com/try/download/community)에서 다운로드하여 설치하세요.

또는 MongoDB Atlas (클라우드)를 사용할 수도 있습니다:
- [MongoDB Atlas](https://www.mongodb.com/atlas)에서 무료 계정 생성
- 클러스터 생성 후 연결 문자열 복사
- 환경변수 `MONGODB_URI`에 연결 문자열 설정

### 3. 의존성 설치
```bash
npm install
```

### 4. MongoDB 실행
로컬 MongoDB를 사용하는 경우:
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

### 5. 서버 실행
```bash
npm start
```

또는 개발 모드로 실행 (자동 재시작):
```bash
npm run dev
```

### 6. 게임 플레이
브라우저에서 `http://localhost:9000`으로 접속하여 게임을 플레이하세요.

## 📁 프로젝트 구조

```
mini/
├── index.html          # 메인 HTML 파일
├── game.js            # 게임 로직
├── auth.js            # 인증 관련 JavaScript
├── server.js          # 백엔드 서버
├── package.json       # Node.js 의존성
└── README.md         # 프로젝트 설명서
```

## 🔧 기술 스택

### 프론트엔드
- **HTML5 Canvas**: 게임 렌더링
- **JavaScript (ES6+)**: 게임 로직 및 UI
- **CSS3**: 스타일링 및 애니메이션

### 백엔드
- **Node.js**: 서버 런타임
- **Express.js**: 웹 프레임워크
- **MongoDB**: NoSQL 데이터베이스
- **Mongoose**: MongoDB ODM
- **JWT**: 인증 토큰
- **bcryptjs**: 비밀번호 해시화

## 🎮 게임 요소

### 장애물
- **선인장**: 바닥에 위치한 장애물
- **새**: 공중을 날아다니는 장애물 (화면보다 빠른 속도)
- **구름**: 천장에 위치, 닿으면 안개 효과

### 아이템
- **무적 별**: 3초간 무적 상태가 되는 아이템

### 효과
- **방귀 효과**: 캐릭터 뒤쪽으로 나가는 가스 효과
- **자취**: 캐릭터가 지나온 흔적
- **안개**: 구름에 닿으면 화면이 흐려짐
- **무적 효과**: 아이템 획득 시 캐릭터가 반짝임

## 🔐 API 엔드포인트

### 인증
- `POST /api/register` - 회원가입
- `POST /api/login` - 로그인
- `GET /api/verify` - 토큰 검증

### 점수
- `POST /api/scores` - 점수 저장
- `GET /api/scores/best` - 사용자 최고 점수 조회
- `GET /api/scores/leaderboard` - 전체 랭킹 조회
- `GET /api/scores/history` - 사용자 점수 히스토리
- `GET /api/stats` - 사용자 통계 (총 게임 수, 평균 점수 등)

## 🎯 게임 규칙

1. **목표**: 장애물을 피하며 최대한 오래 살아남기
2. **점수**: 장애물을 통과할 때마다 점수 증가
3. **게임 오버 조건**:
   - 장애물과 충돌
   - 구름에 1.5초 이상 머무름
4. **특별 기능**:
   - 무적 아이템으로 3초간 무적 상태
   - 구름에 닿으면 안개 효과로 시야 제한

## 🛠️ 개발자 정보

이 게임은 HTML5 Canvas와 JavaScript를 사용하여 개발되었습니다.
백엔드는 Node.js와 Express를 사용하여 구현되었습니다.

## 📝 라이선스

MIT License
