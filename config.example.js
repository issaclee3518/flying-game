// 환경 설정 예시 파일
// 이 파일을 config.js로 복사하고 실제 값으로 수정하세요

module.exports = {
    // MongoDB 연결 설정
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/desert-flight-game',
    
    // JWT 시크릿 키 (프로덕션에서는 반드시 변경하세요!)
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-this-in-production',
    
    // 서버 포트
    PORT: process.env.PORT || 3000,
    
    // MongoDB Atlas 연결 예시
    // MONGODB_URI: 'mongodb+srv://username:password@cluster.mongodb.net/desert-flight-game?retryWrites=true&w=majority'
};
