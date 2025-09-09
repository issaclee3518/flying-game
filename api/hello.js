// 간단한 테스트 API
export default function handler(req, res) {
    res.status(200).json({ 
        message: 'Hello from Vercel!',
        timestamp: new Date().toISOString(),
        method: req.method
    });
}
