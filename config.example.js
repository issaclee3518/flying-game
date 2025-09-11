// Firebase 설정 예시 파일
// 이 파일을 .env로 복사하고 실제 값으로 변경하세요

module.exports = {
  // Firebase 설정
  firebase: {
    apiKey: "AIzaSyCTudrQa8PRVV6pBkUxdUjYm-6gjy71Gcw",
    authDomain: "mini-game-89572.firebaseapp.com",
    projectId: "mini-game-89572",
    storageBucket: "mini-game-89572.firebasestorage.app",
    messagingSenderId: "439863312866",
    appId: "1:439863312866:web:636bde51bf5c75d84a79bb",
    measurementId: "G-D3KMQWRPKK"
  },
  
  // Firebase Admin SDK (서버 사이드용)
  firebaseAdmin: {
    projectId: "mini-game-89572",
    privateKeyId: "your-private-key-id",
    privateKey: "-----BEGIN PRIVATE KEY-----\nyour-private-key\n-----END PRIVATE KEY-----\n",
    clientEmail: "firebase-adminsdk-xxxxx@mini-game-89572.iam.gserviceaccount.com",
    clientId: "your-client-id",
    clientCertUrl: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxxxx%40mini-game-89572.iam.gserviceaccount.com"
  },
  
  // JWT Secret (기존)
  jwtSecret: "your-secret-key-change-this-in-production",
  
  // 서버 포트
  port: 9000
};