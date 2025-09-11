// Game state and settings
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameStatusElement = document.getElementById('gameStatus');
const gameOverPanel = document.getElementById('gameOverPanel');
const finalScoreElement = document.getElementById('finalScore');
const restartButton = document.getElementById('restartButton');

// Mobile support - Canvas size setup
function setupCanvas() {
    const isMobile = window.innerWidth <= 768;
    const isSmallMobile = window.innerWidth <= 480;
    
    if (isSmallMobile) {
        canvas.width = 320;
        canvas.height = 240;
    } else if (isMobile) {
        canvas.width = 400;
        canvas.height = 300;
    } else {
        canvas.width = 800;
        canvas.height = 400;
    }
}

// Initial canvas setup
setupCanvas();

// Mobile detection and control text update
function updateControlText() {
    const controlText = document.getElementById('controlText');
    if (controlText) {
        const isMobile = window.innerWidth <= 768;
        
        if (isMobile) {
            controlText.textContent = 'Touch the screen to fly up!';
        } else {
            controlText.textContent = 'Press SPACE or click to jump!';
        }
    }
}

// Initial control text setup (요소가 있을 때만 실행)
updateControlText();

// Game variables
let gameRunning = true;
let score = 0;
let frameCount = 0;
let gameStartTime = Date.now();
let lastFrameTime = Date.now();

// 게임 상태를 전역에서 접근 가능하도록 설정
window.gameRunning = gameRunning;

// 오디오 시스템
const audio = {
    // 오디오 파일들 (Web Audio API로 생성)
    jumpSound: null,
    collisionSound: null,
    itemCollectSound: null,
    gameOverSound: null,
    newRecordSound: null,
    backgroundMusic: null,
    
    // 실제 음악 파일
    backgroundMusicFile: null,
    backgroundMusicSource: null,
    
    // HTML5 Audio 요소
    html5Audio: null,
    
    // 음량 설정
    masterVolume: 0.7,
    musicVolume: 0.4,
    sfxVolume: 0.8,
    
    // 오디오 컨텍스트
    audioContext: null,
    
    // 초기화
    init() {
        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.createSounds();
            this.loadBackgroundMusic();
            this.initHTML5Audio();
        } catch (error) {
            console.log('Audio not supported:', error);
        }
    },
    
    // HTML5 Audio 초기화
    initHTML5Audio() {
        this.html5Audio = new Audio('music.mp3');
        this.html5Audio.loop = true;
        this.html5Audio.volume = this.masterVolume * this.musicVolume;
        console.log('HTML5 Audio initialized');
    },
    
    // 배경음악 파일 로드
    async loadBackgroundMusic() {
        try {
            console.log('Loading background music...');
            const response = await fetch('music.mp3');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const arrayBuffer = await response.arrayBuffer();
            this.backgroundMusicFile = await this.audioContext.decodeAudioData(arrayBuffer);
            console.log('Background music loaded successfully:', this.backgroundMusicFile.duration, 'seconds');
        } catch (error) {
            console.log('Failed to load background music:', error);
            console.log('Will use fallback generated music');
        }
    },
    
    // 사운드 생성 (Web Audio API 사용)
    createSounds() {
        if (!this.audioContext) return;
        
        // 점프 사운드 (짧은 톤)
        this.jumpSound = this.createTone(400, 0.1, 'sine');
        
        // 충돌 사운드 (낮은 톤)
        this.collisionSound = this.createTone(150, 0.3, 'sawtooth');
        
        // 아이템 수집 사운드 (높은 톤)
        this.itemCollectSound = this.createTone(800, 0.2, 'square');
        
        // 게임 오버 사운드 (긴 낮은 톤)
        this.gameOverSound = this.createTone(100, 1.0, 'triangle');
        
        // 새 기록 사운드 (상승하는 톤)
        this.newRecordSound = this.createRisingTone();
        
        // 배경음악 (사막 테마)
        this.createBackgroundMusic();
    },
    
    // 톤 생성
    createTone(frequency, duration, type = 'sine') {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime);
            oscillator.type = type;
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.masterVolume * this.sfxVolume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + duration);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + duration);
        };
    },
    
    // 상승하는 톤 생성 (새 기록용)
    createRisingTone() {
        return () => {
            if (!this.audioContext) return;
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = 'sine';
            
            // 주파수가 400Hz에서 800Hz로 상승
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(800, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.masterVolume * this.sfxVolume, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    },
    
    // 배경음악 생성
    createBackgroundMusic() {
        if (!this.audioContext) return;
        
        // 사막 테마 배경음악 패턴
        this.backgroundMusic = {
            isPlaying: false,
            oscillators: [],
            gainNodes: [],
            melody: [
                // 메인 멜로디 (사막 테마)
                [220, 247, 277, 330, 370, 415, 370, 330], // A3, B3, C#4, E4, F#4, G#4, F#4, E4
                [330, 370, 415, 494, 415, 370, 330, 277], // E4, F#4, G#4, B4, G#4, F#4, E4, C#4
                [220, 247, 277, 330, 370, 415, 370, 330], // 반복
                [330, 370, 415, 494, 415, 370, 330, 277]  // 반복
            ],
            melodyIndex: 0,
            currentNote: 0,
            noteDuration: 1500, // 1.5초마다 음표 변경
            currentMelody: 0,
            lastNoteTime: 0,
            
            start() {
                if (this.isPlaying) return;
                
                this.isPlaying = true;
                this.currentNote = 0;
                this.currentMelody = 0;
                this.lastNoteTime = audio.audioContext.currentTime;
                this.playMelody();
            },
            
            playMelody() {
                if (!this.isPlaying) return;
                
                const currentTime = audio.audioContext.currentTime;
                
                // 새로운 음표 시작
                if (currentTime - this.lastNoteTime >= this.noteDuration / 1000) {
                    // 이전 음표 정리
                    this.stopCurrentNote();
                    
                    // 새로운 음표 생성
                    const currentMelodyLine = this.melody[this.currentMelody];
                    const frequency = currentMelodyLine[this.currentNote];
                    const oscillator = audio.audioContext.createOscillator();
                    const gainNode = audio.audioContext.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audio.audioContext.destination);
                    
                    oscillator.type = 'triangle';
                    oscillator.frequency.setValueAtTime(frequency, currentTime);
                    
                    // 부드러운 페이드 인/아웃
                    gainNode.gain.setValueAtTime(0, currentTime);
                    gainNode.gain.linearRampToValueAtTime(audio.masterVolume * audio.musicVolume * 0.2, currentTime + 0.1);
                    gainNode.gain.linearRampToValueAtTime(audio.masterVolume * audio.musicVolume * 0.2, currentTime + this.noteDuration / 1000 - 0.1);
                    gainNode.gain.linearRampToValueAtTime(0, currentTime + this.noteDuration / 1000);
                    
                    oscillator.start(currentTime);
                    oscillator.stop(currentTime + this.noteDuration / 1000);
                    
                    this.oscillators.push(oscillator);
                    this.gainNodes.push(gainNode);
                    
                    // 다음 음표로 이동
                    this.currentNote = (this.currentNote + 1) % this.melody.length;
                    this.lastNoteTime = currentTime;
                }
                
                // 다음 프레임에서 계속
                if (this.isPlaying) {
                    requestAnimationFrame(() => this.playMelody());
                }
            },
            
            stopCurrentNote() {
                // 오래된 오실레이터 정리
                this.oscillators = this.oscillators.filter(osc => {
                    try {
                        osc.stop();
                        return false;
                    } catch (e) {
                        return false;
                    }
                });
                this.gainNodes = [];
            },
            
            stop() {
                if (!this.isPlaying) return;
                
                this.isPlaying = false;
                this.stopCurrentNote();
            }
        };
    },
    
    // 사운드 재생
    play(soundName) {
        if (!this[soundName]) return;
        
        // 음소거 상태 확인
        if (this.masterVolume <= 0) {
            console.log('Sound muted, not playing:', soundName);
            return;
        }
        
        // 사용자 상호작용 후에만 오디오 재생
        if (this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume().then(() => {
                    this[soundName]();
                }).catch(error => {
                    console.log('Audio resume failed:', error);
                });
            } else {
                this[soundName]();
            }
        }
    },
    
    // 배경음악 재생/정지
    playMusic() {
        // HTML5 Audio 우선 사용
        if (this.html5Audio) {
            this.playHTML5Music();
        } else if (this.backgroundMusicFile) {
            // Web Audio API 사용
            this.playBackgroundMusicFile();
        } else if (this.backgroundMusic) {
            // 폴백: 생성된 음악 재생
            this.backgroundMusic.start();
        }
    },
    
    // HTML5 Audio로 음악 재생
    playHTML5Music() {
        if (!this.html5Audio) return;
        
        this.html5Audio.currentTime = 0;
        // 음소거 상태 확인
        const volume = this.masterVolume > 0 ? this.masterVolume * this.musicVolume : 0;
        this.html5Audio.volume = volume;
        this.html5Audio.play().then(() => {
            console.log('HTML5 Background music started, volume:', volume);
        }).catch(error => {
            console.log('HTML5 Background music failed:', error);
        });
    },
    
    playBackgroundMusicFile() {
        if (!this.backgroundMusicFile || !this.audioContext) return;
        
        // 이전 음악 정지
        this.stopMusic();
        
        // 새 음악 재생
        this.backgroundMusicSource = this.audioContext.createBufferSource();
        this.backgroundMusicSource.buffer = this.backgroundMusicFile;
        this.backgroundMusicSource.loop = true; // 반복 재생
        
        // 볼륨 조절
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = this.masterVolume * this.musicVolume;
        
        this.backgroundMusicSource.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        
        this.backgroundMusicSource.start(0);
        console.log('Background music started');
    },
    
    stopMusic() {
        // HTML5 Audio 정지
        if (this.html5Audio) {
            this.html5Audio.pause();
            this.html5Audio.currentTime = 0;
            console.log('HTML5 Background music stopped');
        }
        
        // Web Audio API 정지
        if (this.backgroundMusicSource) {
            try {
                this.backgroundMusicSource.stop();
                this.backgroundMusicSource = null;
                console.log('Web Audio Background music stopped');
            } catch (error) {
                console.log('Error stopping background music:', error);
            }
        }
        if (this.backgroundMusic) {
            this.backgroundMusic.stop();
        }
    }
};

// 오디오 시스템을 전역에서 접근 가능하도록 설정
window.audio = audio;

// 페이지 로드 시 오디오 시스템 초기화
document.addEventListener('DOMContentLoaded', () => {
    audio.init();
    console.log('Audio system initialized');
});

// Fog effect variables
let fogEffect = 0; // Value between 0~1, 1 is maximum fog
let fogDecayRate = 0.02; // Fog disappearing speed
let fogTimer = 0; // Fog duration (3 seconds = 180 frames)
let fogDuration = 180; // 3 seconds duration
let cloudTimer = 0; // Time inside cloud
let cloudDuration = 90; // 1.5 seconds = 90 frames

// Player object
const player = {
    x: 100,
    y: 200,
    width: 20, // 25 → 20 (80%)
    height: 20, // 25 → 20 (80%)
    velocityY: 0,
    upSpeed: -3600, // 위로 올라가는 속도 (픽셀/초) - 광속!
    downSpeed: 3600, // 아래로 떨어지는 속도 (픽셀/초) - 광속!
    color: '#4CAF50'
};

// 스페이스바 상태 추적
let spacePressed = false;

// 터치 상태 추적
let touchPressed = false;

// 캐릭터 자취 배열
let playerTrail = [];

// 장애물 배열
let obstacles = [];

// 파티클 효과 배열
let particles = [];

// 구름 배열
let clouds = [];

// 아이템 배열
let items = [];

// 무적 상태 변수
let invincible = false;
let invincibleTimer = 0;
let invincibleDuration = 180; // 3초 = 180프레임 (60fps 기준)

// 게임 설정
const OBSTACLE_SPEED = 300; // 초당 300픽셀 - 더 빠른 화면 스크롤!
const MIN_GAP = 140; // 간격 늘림
const MAX_GAP = 200; // 간격 늘림
const CLOUD_SPEED = 200; // 구름 속도 - 더 빠르게!

// 성능 최적화 설정
const MAX_PARTICLES = 50; // 최대 파티클 수 제한
const MAX_TRAIL_LENGTH = 30; // 자취 길이 제한
const PERFORMANCE_MODE = false; // 성능 모드 (낮은 사양 기기용)

// 플레이어 그리기
function drawPlayer() {
    ctx.save();
    
    // 무적 상태일 때 반짝이는 효과
    if (invincible) {
        ctx.globalAlpha = 0.7 + Math.sin(frameCount * 0.3) * 0.3; // 깜빡이는 효과
        ctx.shadowColor = '#FFD700'; // 금색 그림자
        ctx.shadowBlur = 10;
    }
    
    // 캐릭터 몸체 (원형)
    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.x + player.width/2, player.y + player.height/2, player.width/2, 0, Math.PI * 2);
    ctx.fill();
    
    // 눈 (크기와 위치를 80%로 조정)
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(player.x + 6.4, player.y + 6.4, 3.2, 0, Math.PI * 2); // 8→6.4, 4→3.2
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 13.6, player.y + 6.4, 3.2, 0, Math.PI * 2); // 17→13.6, 4→3.2
    ctx.fill();
    
    // 눈동자 (크기와 위치를 80%로 조정)
    ctx.fillStyle = 'black';
    ctx.beginPath();
    ctx.arc(player.x + 7.2, player.y + 6.4, 1.6, 0, Math.PI * 2); // 9→7.2, 2→1.6
    ctx.fill();
    ctx.beginPath();
    ctx.arc(player.x + 14.4, player.y + 6.4, 1.6, 0, Math.PI * 2); // 18→14.4, 2→1.6
    ctx.fill();
    
    // 프로펠러 (회전 효과) - 시간 기반으로 일정한 속도 (크기 80%로 조정)
    ctx.strokeStyle = '#FF5722';
    ctx.lineWidth = 1.6; // 2 → 1.6 (80%)
    const currentTime = Date.now();
    const propellerAngle = (currentTime - gameStartTime) * 0.01; // 일정한 회전 속도
    ctx.save();
    ctx.translate(player.x + player.width/2, player.y - 4.8); // -6 → -4.8 (80%)
    ctx.rotate(propellerAngle);
    ctx.beginPath();
    ctx.moveTo(-8, 0); // -10 → -8 (80%)
    ctx.lineTo(8, 0); // 10 → 8 (80%)
    ctx.stroke();
    ctx.restore();
    
    ctx.restore(); // 무적 효과 restore
}


// 캐릭터 색상 변경 함수
function changeCharacterColor(characterType) {
    const colorMap = {
        'blue': '#2196F3',
        'yellow': '#FFEB3B',
        'white': '#FFFFFF',
        'green': '#4CAF50'
    };
    
    if (colorMap[characterType]) {
        player.color = colorMap[characterType];
        console.log('Character color changed to:', characterType, player.color);
    }
}

// 게임 시작 시 저장된 캐릭터 색상 불러오기
function loadSavedCharacter() {
    const savedCharacter = localStorage.getItem('selectedCharacter') || 'green';
    changeCharacterColor(savedCharacter);
}

// 게임 객체를 전역으로 노출
window.game = {
    changeCharacter: changeCharacterColor
};

// 장애물 생성
function createObstacle() {
    const obstacleType = Math.random();
    
    if (obstacleType < 0.4) {
        // 선인장만 (40% 확률)
        createGroundObstacles();
    } else if (obstacleType < 0.7) {
        // 선인장 + 새 조합 (30% 확률)
        createCactusAndBirdPattern();
    } else {
        // 새만 (30% 확률)
        createBirdObstacles();
    }
}

function createNormalObstacle() {
    const gap = MIN_GAP + Math.random() * (MAX_GAP - MIN_GAP);
    const width = 15 + Math.random() * 15; // 15~30 얇은 두께
    const minHeight = 50;
    const maxHeight = canvas.height - gap - minHeight;
    const topHeight = Math.random() * (maxHeight - minHeight) + minHeight;
    
    obstacles.push({
        x: canvas.width,
        width: width,
        topHeight: topHeight,
        bottomY: topHeight + gap,
        bottomHeight: canvas.height - (topHeight + gap),
        passed: false,
        type: 'normal',
        color: getRandomObstacleColor()
    });
}

function createTopOnlyObstacle() {
    const width = 12 + Math.random() * 18; // 12~30 얇은 두께
    const height = 80 + Math.random() * 120; // 80~200 랜덤 높이
    
    obstacles.push({
        x: canvas.width,
        width: width,
        topHeight: height,
        bottomY: canvas.height + 10, // 바닥 장애물 없음
        bottomHeight: 0,
        passed: false,
        type: 'top',
        color: getRandomObstacleColor()
    });
}

function createBottomOnlyObstacle() {
    const width = 12 + Math.random() * 18; // 12~30 얇은 두께
    const height = 80 + Math.random() * 120; // 80~200 랜덤 높이
    const bottomY = canvas.height - height;
    
    obstacles.push({
        x: canvas.width,
        width: width,
        topHeight: 0, // 천장 장애물 없음
        bottomY: bottomY,
        bottomHeight: height,
        passed: false,
        type: 'bottom',
        color: getRandomObstacleColor()
    });
}

function createCircleObstacles() {
    const numCircles = 4 + Math.floor(Math.random() * 5); // 4~8개로 늘림
    
    // 화면을 세로로 구역 나누기
    const zones = [];
    const zoneHeight = (canvas.height - 120) / 3; // 안전 여백 늘림
    for (let i = 0; i < 3; i++) {
        zones.push(60 + i * zoneHeight);
    }
    
    for (let i = 0; i < numCircles; i++) {
        const radius = 12 + Math.random() * 15; // 12~27 반지름 (크기 줄임)
        const x = canvas.width + i * (65 + Math.random() * 50); // 65~115픽셀 간격으로 증가 (통과 가능하게)
        
        // 각 구역에서 랜덤하게 선택하되, 골고루 분배
        const zoneIndex = i % zones.length;
        const baseY = zones[zoneIndex];
        const y = baseY + (Math.random() - 0.5) * (zoneHeight * 0.6); // 구역 내 변화 줄임
        
        obstacles.push({
            x: x,
            y: Math.max(40, Math.min(canvas.height - 80, y)), // 경계 보정 늘림
            radius: Math.max(12, Math.min(25, radius)), // 크기 제한
            width: radius * 2, // 충돌 감지용
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'circle',
            color: getRandomRockColor()
        });
    }
}

// 구름 생성 함수
function createClouds() {
    const numClouds = 8 + Math.floor(Math.random() * 12); // 8~19개의 구름
    const baseX = canvas.width;
    
    for (let i = 0; i < numClouds; i++) {
        const width = 30 + Math.random() * 40; // 30~70 너비 (줄임)
        const height = 15 + Math.random() * 20; // 15~35 높이 (줄임)
        const x = baseX + i * (15 + Math.random() * 25); // 15~40픽셀 간격으로 촘촘하게
        const y = Math.random() * 30; // 천장에서 0~30픽셀 아래 (줄임)
        
        clouds.push({
            x: x,
            y: y,
            width: width,
            height: height,
            opacity: 0.6 + Math.random() * 0.4, // 0.6~1.0 투명도
            speed: CLOUD_SPEED * (0.8 + Math.random() * 0.4) // 속도 변화
        });
    }
}

function createItems() {
    // 무적 아이템 생성 (가끔씩)
    if (Math.random() < 0.3) { // 30% 확률로 아이템 생성
        const x = canvas.width + Math.random() * 200; // 화면 오른쪽에서 시작
        const y = 100 + Math.random() * (canvas.height - 200); // 중간 공간에 배치
        
        items.push({
            x: x,
            y: y,
            width: 15,
            height: 15,
            type: 'invincible',
            collected: false,
            animation: 0 // 애니메이션용
        });
    }
}

// 아이템 그리기 함수
function drawItems() {
    items.forEach(item => {
        if (!item.collected) {
            // 아이템 애니메이션 (위아래로 떠다니는 효과)
            item.animation += 0.1;
            const floatY = item.y + Math.sin(item.animation) * 3;
            
            // 무적 아이템 그리기 (반짝이는 별 모양)
            ctx.save();
            ctx.translate(item.x + item.width/2, floatY + item.height/2);
            ctx.rotate(item.animation * 0.5); // 회전 효과
            
            // 별 모양 그리기
            ctx.fillStyle = '#FFD700'; // 금색
            ctx.strokeStyle = '#FFA500'; // 주황색 테두리
            ctx.lineWidth = 2;
            
            ctx.beginPath();
            const spikes = 5;
            const outerRadius = item.width/2;
            const innerRadius = outerRadius * 0.4;
            
            for (let i = 0; i < spikes * 2; i++) {
                const angle = (i / (spikes * 2)) * Math.PI * 2;
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            
            // 반짝이는 효과
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            ctx.beginPath();
            ctx.arc(-3, -3, 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    });
}

// 구름 그리기 함수
function drawClouds() {
    clouds.forEach(cloud => {
        ctx.save();
        ctx.globalAlpha = cloud.opacity;
        
        // 구름 그라데이션
        const gradient = ctx.createRadialGradient(
            cloud.x + cloud.width/2, cloud.y + cloud.height/2, 0,
            cloud.x + cloud.width/2, cloud.y + cloud.height/2, cloud.width/2
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
        gradient.addColorStop(0.7, 'rgba(240, 248, 255, 0.7)');
        gradient.addColorStop(1, 'rgba(220, 235, 250, 0.5)');
        
        ctx.fillStyle = gradient;
        
        // 구름을 여러 원으로 구성 - 고정된 모양
        const numBubbles = 4; // 고정된 개수
        for (let i = 0; i < numBubbles; i++) {
            const bubbleX = cloud.x + (i / (numBubbles - 1)) * cloud.width * 0.8;
            const bubbleY = cloud.y + cloud.height * 0.3 + (i % 2 === 0 ? -0.2 : 0.2) * cloud.height * 0.3; // 고정된 패턴
            const bubbleRadius = cloud.height * (0.5 + (i % 2) * 0.2); // 고정된 크기 패턴
            
            ctx.beginPath();
            ctx.arc(bubbleX, bubbleY, bubbleRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    });
}

// 구름과 플레이어 충돌 감지
function checkCloudCollision() {
    for (let cloud of clouds) {
        if (player.x + player.width > cloud.x &&
            player.x < cloud.x + cloud.width &&
            player.y + player.height > cloud.y &&
            player.y < cloud.y + cloud.height) {
            return true;
        }
    }
    return false;
}

// 천장 작은 장애물 제거됨 - 이제 구름 4초 타이머 시스템 사용

function createFloatingObstacles() {
    const numBoxes = 4 + Math.floor(Math.random() * 5); // 4~8개로 늘림
    
    // 화면을 4개 세로 구역으로 나누기
    const zones = [];
    const zoneHeight = (canvas.height - 140) / 4; // 안전 여백 늘림
    for (let i = 0; i < 4; i++) {
        zones.push(70 + i * zoneHeight);
    }
    
    for (let i = 0; i < numBoxes; i++) {
        const width = 12 + Math.random() * 18; // 12~30 너비 (크기 줄임)
        const height = 10 + Math.random() * 15; // 10~25 높이 (크기 줄임)
        const x = canvas.width + i * (60 + Math.random() * 45); // 60~105픽셀 간격으로 증가 (통과 가능하게)
        
        // 각 구역에 골고루 분배
        const zoneIndex = i % zones.length;
        const baseY = zones[zoneIndex];
        const y = baseY + (Math.random() - 0.5) * (zoneHeight * 0.7); // 구역 내에서 랜덤
        
        obstacles.push({
            x: x,
            y: Math.max(40, Math.min(canvas.height - 80, y)), // 경계 보정
            width: width,
            height: height,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'floating',
            color: getRandomRockColor() // 회색 바위 색상
        });
    }
}

function createGroundObstacles() {
    const numObstacles = 8 + Math.floor(Math.random() * 10); // 8~17개로 더 늘림
    
    for (let i = 0; i < numObstacles; i++) {
        const x = canvas.width + i * (30 + Math.random() * 25); // 30~55픽셀 간격으로 조정
        
        // 모든 바닥 장애물을 긴 선인장으로 통일
        const width = 15 + Math.random() * 20; // 15~35 너비
        const height = 30 + Math.random() * 50; // 30~80 높이 (길게 유지)
        
        obstacles.push({
            x: x,
            y: canvas.height - height,
            width: width,
            height: height,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'cactus',
            color: getRandomObstacleColor()
        });
    }
}

function createCeilingObstacles() {
    const numObstacles = 7 + Math.floor(Math.random() * 8); // 7~14개로 더 늘림
    
    for (let i = 0; i < numObstacles; i++) {
        const obstacleType = Math.random();
        const x = canvas.width + i * (25 + Math.random() * 30); // 25~55픽셀 간격으로 조정
        
        if (obstacleType < 0.4) {
            // 천장 삼각형 고드름 (40%)
            const width = 12 + Math.random() * 18; // 12~30 너비
            const height = 15 + Math.random() * 35; // 15~50 높이
            
            obstacles.push({
                x: x,
                y: 0,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'ceiling_spike',
                color: getRandomObstacleColor()
            });
        } else if (obstacleType < 0.7) {
            // 천장 사각형 블록 (30%)
            const width = 15 + Math.random() * 25; // 15~40 너비
            const height = 12 + Math.random() * 25; // 12~37 높이
            
            obstacles.push({
                x: x,
                y: 0,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'ceiling_block',
                color: getRandomObstacleColor()
            });
        } else {
            // 천장 원형 돌덩이 (30%)
            const radius = 8 + Math.random() * 15; // 8~23 반지름
            
            obstacles.push({
                x: x,
                y: 0,
                radius: radius,
                width: radius * 2,
                height: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'ceiling_circle',
                color: getRandomObstacleColor()
            });
        }
    }
}

function createComplexObstacles() {
    const patternType = Math.random();
    
    if (patternType < 0.25) {
        // 바닥 선인장 + 위쪽 장애물 (25%)
        createGroundPlusTopPattern();
    } else if (patternType < 0.5) {
        // 바닥 선인장 + 떠다니는 바위 (25%)
        createGroundPlusFloatingPattern();
    } else if (patternType < 0.75) {
        // 바닥 선인장 + 동그라미 바위 (25%)
        createGroundPlusCirclePattern();
    } else {
        // 바닥 선인장 + 동그라미 바위 + 떠다니는 바위 (25%)
        createGroundObstacles();
        createCircleObstacles();
        createFloatingObstacles();
    }
}

function createContinuousCactusPattern() {
    // 연속으로 선인장이 나오는 패턴
    const patternType = Math.random();
    
    if (patternType < 0.4) {
        // 큰 선인장 + 작은 선인장 연속 (40%)
        createGroundObstacles();
        createGroundMiniLine();
    } else if (patternType < 0.7) {
        // 큰 선인장만 연속 (30%)
        createGroundObstacles();
        createGroundObstacles();
    } else {
        // 작은 선인장만 연속 (30%)
        createGroundMiniLine();
        createGroundMiniLine();
    }
}

function createCactusAndCirclePattern() {
    // 선인장 + 동그라미 바위 조합
    createGroundObstacles();
    createCircleObstacles();
}

function createCactusAndFloatingPattern() {
    // 선인장 + 떠다니는 바위 조합
    createGroundObstacles();
    createFloatingObstacles();
}

function createCactusAndBothRocksPattern() {
    // 선인장 + 동그라미 바위 + 떠다니는 바위 조합
    createGroundObstacles();
    createCircleObstacles();
    createFloatingObstacles();
}

function createCactusAndTopPattern() {
    // 선인장 + 위쪽 장애물 조합
    createGroundObstacles();
    createTopOnlyObstacle();
}

function createCactusAndBottomPattern() {
    // 선인장 + 아래쪽 장애물 조합
    createGroundObstacles();
    createBottomOnlyObstacle();
}

function createCactusAndNormalPattern() {
    // 선인장 + 일반 위아래 장애물 조합
    createGroundObstacles();
    createNormalObstacle();
}

function createBirdObstacles() {
    // 새 장애물 생성 (조금 더 많게)
    const numBirds = 3 + Math.floor(Math.random() * 4); // 3~6마리
    
    for (let i = 0; i < numBirds; i++) {
        const x = canvas.width + i * (50 + Math.random() * 40); // 50~90픽셀 간격으로 줄임
        const y = 60 + Math.random() * (canvas.height - 120); // 더 넓은 공간에 배치
        
        // 밤에는 검은색 새 확률을 더 줄임
        const isNight = Math.floor(score / 150) % 2 === 1;
        const blackBirdChance = isNight ? 0.05 : 0.1; // 밤에는 5%, 낮에는 10%
        const isBlackBird = Math.random() < blackBirdChance;
        const birdColor = isBlackBird ? '#2C2C2C' : '#8B4513'; // 검은색 또는 갈색
        
        obstacles.push({
            x: x,
            y: y,
            width: 25,
            height: 15,
            type: 'bird',
            color: birdColor,
            wingPhase: Math.random() * Math.PI * 2, // 날개 펄럭임 위상
            passed: false,
            speed: isBlackBird ? OBSTACLE_SPEED * 1.8 : OBSTACLE_SPEED * 1.5, // 검은색 새는 더 빠르게
            isBlackBird: isBlackBird, // 검은색 새 여부
            floatPhase: Math.random() * Math.PI * 2, // 위아래 움직임 위상
            floatAmplitude: isBlackBird ? 2 : 0, // 검은색 새만 위아래 움직임 (살짝씩)
            floatSpeed: isBlackBird ? 0.02 : 0 // 검은색 새만 위아래 움직임 속도 (살짝씩)
        });
    }
}

function createCactusAndBirdPattern() {
    // 선인장 + 새 조합
    createGroundObstacles();
    createBirdObstacles();
}

function createGroundPlusTopPattern() {
    // 먼저 바닥 장애물들 생성
    const numGroundObstacles = 3 + Math.floor(Math.random() * 5); // 3~7개 (증가)
    const baseX = canvas.width;
    
    for (let i = 0; i < numGroundObstacles; i++) {
        const x = baseX + i * (30 + Math.random() * 25); // 30~55픽셀 간격 (줄임)
        const width = 15 + Math.random() * 20;
        const height = 20 + Math.random() * 35;
        
        obstacles.push({
            x: x,
            y: canvas.height - height,
            width: width,
            height: height,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'spike',
            color: getRandomObstacleColor()
        });
        
        // 같은 세로줄에 위쪽 장애물도 추가 (70% 확률로 증가)
        if (Math.random() < 0.7) {
            const topWidth = 12 + Math.random() * 18;
            const topHeight = 60 + Math.random() * 80;
            
            obstacles.push({
                x: x - 10 + Math.random() * 20, // 약간의 위치 변화
                width: topWidth,
                topHeight: topHeight,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'top',
                color: getRandomObstacleColor()
            });
        }
    }
}

function createGroundPlusFloatingPattern() {
    // 바닥 장애물들
    const numGroundObstacles = 3 + Math.floor(Math.random() * 4); // 3~6개 (증가)
    const baseX = canvas.width;
    
    // 화면을 3개 세로 구역으로 나누기 (떠다니는 장애물용)
    const floatingZones = [80, 160, 240]; // 상단, 중단, 하단
    
    for (let i = 0; i < numGroundObstacles; i++) {
        const x = baseX + i * (35 + Math.random() * 30); // 35~65픽셀 간격 (줄임)
        
        // 바닥 장애물
        const groundWidth = 15 + Math.random() * 20; // 크기 줄임
        const groundHeight = 12 + Math.random() * 25; // 크기 줄임
        
        obstacles.push({
            x: x,
            y: canvas.height - groundHeight,
            width: groundWidth,
            height: groundHeight,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'ground_block',
            color: getRandomObstacleColor()
        });
        
        // 각 구역에 골고루 분배되는 떠다니는 장애물 추가
        const floatingWidth = 12 + Math.random() * 20; // 크기 줄임
        const floatingHeight = 10 + Math.random() * 15; // 크기 줄임
        const zoneIndex = i % floatingZones.length;
        const baseY = floatingZones[zoneIndex];
        const floatingY = baseY + (Math.random() - 0.5) * 60; // 구역 내에서 변화
        
        obstacles.push({
            x: x - 20 + Math.random() * 40, // 위치 변화
            y: Math.max(40, Math.min(canvas.height - 80, floatingY)),
            width: floatingWidth,
            height: floatingHeight,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'floating',
            color: getRandomRockColor() // 회색 바위 색상
        });
    }
}

function createGroundPlusCirclePattern() {
    // 바닥 장애물들
    const numGroundObstacles = 3 + Math.floor(Math.random() * 4); // 3~6개 (증가)
    const baseX = canvas.width;
    
    // 공중 동그라미를 위한 구역 설정
    const airZones = [70, 150, 230]; // 상단, 중단, 하단
    
    for (let i = 0; i < numGroundObstacles; i++) {
        const x = baseX + i * (40 + Math.random() * 30); // 40~70픽셀 간격 (줄임)
        
        // 바닥 원형 바위 (크기 줄임)
        const radius = 8 + Math.random() * 12;
        
        obstacles.push({
            x: x,
            y: canvas.height - radius * 2,
            radius: radius,
            width: radius * 2,
            height: radius * 2,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'ground_circle',
            color: getRandomObstacleColor()
        });
        
        // 각 구역에 골고루 분배되는 공중 동그라미 추가
        const airRadius = 10 + Math.random() * 15; // 크기 줄임
        const zoneIndex = i % airZones.length;
        const baseY = airZones[zoneIndex];
        const airY = baseY + (Math.random() - 0.5) * 50; // 구역 내에서 변화
        
        obstacles.push({
            x: x - 15 + Math.random() * 30,
            y: Math.max(30, Math.min(canvas.height - 60, airY)),
            radius: airRadius,
            width: airRadius * 2,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'circle',
            color: getRandomRockColor() // 회색 바위 색상
        });
    }
}

function createGroundMiniLine() {
    // 바닥에 조그만한 장애물들을 쫙 깔기
    const numMinis = 10 + Math.floor(Math.random() * 12); // 10~21개로 더 늘림
    const baseX = canvas.width;
    const startOffset = Math.random() * 30; // 시작 위치 변화
    
    for (let i = 0; i < numMinis; i++) {
        const obstacleType = Math.random();
        const x = baseX + startOffset + i * (20 + Math.random() * 25); // 20~45픽셀 간격으로 조정
        
        if (obstacleType < 0.4) {
            // 미니 가시
            const width = 6 + Math.random() * 8; // 6~14 너비
            const height = 8 + Math.random() * 12; // 8~20 높이
            
            obstacles.push({
                x: x,
                y: canvas.height - height,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_spike',
                color: getRandomObstacleColor()
            });
        } else if (obstacleType < 0.7) {
            // 미니 블록
            const width = 8 + Math.random() * 10; // 8~18 너비
            const height = 6 + Math.random() * 10; // 6~16 높이
            
            obstacles.push({
                x: x,
                y: canvas.height - height,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_block',
                color: getRandomObstacleColor()
            });
        } else {
            // 미니 원형 돌
            const radius = 3 + Math.random() * 6; // 3~9 반지름
            
            obstacles.push({
                x: x,
                y: canvas.height - radius * 2,
                radius: radius,
                width: radius * 2,
                height: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ground_circle',
                color: getRandomObstacleColor()
            });
        }
    }
    
    // 바닥 미니 라인과 함께 중간 공간에 장애물들 추가
    addMiddleObstacles();
}

function createCeilingMiniLine() {
    // 천장에 조그만한 장애물들을 쫙 깔기
    const numMinis = 6 + Math.floor(Math.random() * 8); // 6~13개로 더 늘림
    const baseX = canvas.width;
    const startOffset = Math.random() * 30; // 시작 위치 변화
    
    for (let i = 0; i < numMinis; i++) {
        const obstacleType = Math.random();
        const x = baseX + startOffset + i * (25 + Math.random() * 35); // 25~60픽셀 간격으로 조정
        
        if (obstacleType < 0.4) {
            // 미니 고드름
            const width = 6 + Math.random() * 8; // 6~14 너비
            const height = 8 + Math.random() * 12; // 8~20 높이
            
            obstacles.push({
                x: x,
                y: 0,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ceiling_spike',
                color: getRandomObstacleColor()
            });
        } else if (obstacleType < 0.7) {
            // 미니 천장 블록
            const width = 8 + Math.random() * 10; // 8~18 너비
            const height = 6 + Math.random() * 10; // 6~16 높이
            
            obstacles.push({
                x: x,
                y: 0,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ceiling_block',
                color: getRandomObstacleColor()
            });
        } else {
            // 미니 천장 원형 돌
            const radius = 3 + Math.random() * 6; // 3~9 반지름
            
            obstacles.push({
                x: x,
                y: 0,
                radius: radius,
                width: radius * 2,
                height: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ceiling_circle',
                color: getRandomObstacleColor()
            });
        }
    }
    
    // 천장 미니 라인과 함께 중간 공간에 장애물들 추가
    addMiddleObstacles();
}

function createBothMiniLines() {
    // 바닥과 천장에 동시에 미니 장애물 라인 생성
    
    // 바닥 미니 장애물들
    const numGroundMinis = 8 + Math.floor(Math.random() * 10); // 8~17개로 더 늘림
    const baseX = canvas.width;
    const startOffset = Math.random() * 30;
    
    for (let i = 0; i < numGroundMinis; i++) {
        const obstacleType = Math.random();
        const x = baseX + startOffset + i * (20 + Math.random() * 25); // 20~45픽셀 간격
        
        // 모든 미니 바닥 장애물을 작은 선인장으로 통일
        const width = 6 + Math.random() * 8; // 6~14 너비
        const height = 12 + Math.random() * 18; // 12~30 높이 (길게 유지)
        
        obstacles.push({
            x: x,
            y: canvas.height - height,
            width: width,
            height: height,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'mini_cactus',
            color: getRandomObstacleColor()
        });
    }
    
    // 천장 미니 장애물들
    const numCeilingMinis = 6 + Math.floor(Math.random() * 8); // 6~13개로 더 늘림
    const ceilingOffset = Math.random() * 40; // 바닥과 다른 오프셋
    
    for (let i = 0; i < numCeilingMinis; i++) {
        const obstacleType = Math.random();
        const x = baseX + ceilingOffset + i * (25 + Math.random() * 35); // 25~60픽셀 간격
        
        if (obstacleType < 0.4) {
            // 미니 고드름
            const width = 6 + Math.random() * 8;
            const height = 8 + Math.random() * 12;
            
            obstacles.push({
                x: x,
                y: 0,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ceiling_spike',
                color: getRandomRockColor()
            });
        } else if (obstacleType < 0.7) {
            // 미니 천장 블록
            const width = 8 + Math.random() * 10;
            const height = 6 + Math.random() * 10;
            
            obstacles.push({
                x: x,
                y: 0,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ceiling_block',
                color: getRandomRockColor()
            });
        } else {
            // 미니 천장 원형 돌
            const radius = 3 + Math.random() * 6;
            
            obstacles.push({
                x: x,
                y: 0,
                radius: radius,
                width: radius * 2,
                height: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'mini_ceiling_circle',
                color: getRandomRockColor()
            });
        }
    }
    
    // 중간 공간에도 장애물 추가
    addMiddleObstacles();
}

function createGroundPlusCeilingPattern() {
    // 바닥과 천장에 동시 장애물 배치
    const numPairs = 6 + Math.floor(Math.random() * 8); // 6~13쌍으로 더 늘림
    const baseX = canvas.width;
    
    for (let i = 0; i < numPairs; i++) {
        const x = baseX + i * (25 + Math.random() * 20); // 25~45픽셀 간격으로 조정
        
        // 바닥 장애물
        const groundType = Math.random();
        if (groundType < 0.5) {
            // 바닥 가시
            const width = 15 + Math.random() * 20;
            const height = 20 + Math.random() * 35;
            
            obstacles.push({
                x: x,
                y: canvas.height - height,
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'spike',
                color: getRandomObstacleColor()
            });
        } else {
            // 바닥 원형 바위
            const radius = 10 + Math.random() * 15;
            
            obstacles.push({
                x: x,
                y: canvas.height - radius * 2,
                radius: radius,
                width: radius * 2,
                height: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'ground_circle',
                color: getRandomObstacleColor()
            });
        }
        
        // 같은 세로줄에 천장 장애물 추가 (95% 확률로 더 증가)
        if (Math.random() < 0.95) {
            const ceilingType = Math.random();
            const offsetX = -15 + Math.random() * 30; // 위치 약간 변화
            
            if (ceilingType < 0.5) {
                // 천장 고드름
                const width = 12 + Math.random() * 18;
                const height = 15 + Math.random() * 35;
                
                obstacles.push({
                    x: x + offsetX,
                    y: 0,
                    width: width,
                    height: height,
                    topHeight: 0,
                    bottomY: canvas.height + 10,
                    bottomHeight: 0,
                    passed: false,
                    type: 'ceiling_spike',
                    color: getRandomObstacleColor()
                });
            } else {
                // 천장 원형 돌덩이
                const radius = 8 + Math.random() * 15;
                
                obstacles.push({
                    x: x + offsetX,
                    y: 0,
                    radius: radius,
                    width: radius * 2,
                    height: radius * 2,
                    topHeight: 0,
                    bottomY: canvas.height + 10,
                    bottomHeight: 0,
                    passed: false,
                    type: 'ceiling_circle',
                    color: getRandomObstacleColor()
                });
            }
        }
    }
}

// 장애물 겹침 체크 함수
function checkOverlap(newObstacle, existingObstacles) {
    for (let existing of existingObstacles) {
        const distance = Math.sqrt(
            Math.pow(newObstacle.x - existing.x, 2) + 
            Math.pow(newObstacle.y - existing.y, 2)
        );
        
        // 최소 거리 체크 (크기에 따라 조정)
        const minDistance = Math.max(
            (newObstacle.width || newObstacle.radius * 2) + (existing.width || existing.radius * 2),
            30 // 최소 30픽셀 간격
        ) / 2;
        
        if (distance < minDistance) {
            return true; // 겹침
        }
    }
    return false; // 겹치지 않음
}

function addMiddleObstacles() {
    // 중간 공간에 골고루 배치되는 장애물들 추가
    const obstacleType = Math.random();
    
    if (obstacleType < 0.3) {
        // 동그라미 바위 장애물 추가 (30% 확률)
        addMiddleCircles();
    } else if (obstacleType < 0.6) {
        // 떠다니는 바위 박스 추가 (30% 확률)
        addMiddleFloatingBoxes();
    } else if (obstacleType < 0.8) {
        // 혼합 패턴 (20% 확률)
        addMiddleMixedPattern();
    } else {
        // 추가 동그라미 + 박스 바위 동시 생성 (20% 확률로 증가)
        addMiddleCircles();
        addMiddleFloatingBoxes();
    }
}

function addMiddleCircles() {
    const numCircles = 4 + Math.floor(Math.random() * 5); // 4~8개로 더 늘림
    const zones = [100, 200, 300]; // 상단, 중단, 하단 (미니 장애물 피해서)
    const currentObstacles = []; // 현재 생성된 장애물들
    
    for (let i = 0; i < numCircles; i++) {
        let attempts = 0;
        let placed = false;
        
        while (attempts < 5 && !placed) { // 최대 5번 시도
            const radius = 12 + Math.random() * 18; // 12~30 반지름
            const x = canvas.width + i * (80 + Math.random() * 50); // 80~130픽셀 간격으로 증가 (통과 가능하게)
            
            const zoneIndex = i % zones.length;
            const baseY = zones[zoneIndex];
            const y = baseY + (Math.random() - 0.5) * 60; // 구역 내에서 변화
            
            const newObstacle = {
                x: x,
                y: Math.max(50, Math.min(canvas.height - 100, y)),
                radius: radius,
                width: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'circle',
                color: getRandomRockColor()
            };
            
            if (!checkOverlap(newObstacle, currentObstacles)) {
                obstacles.push(newObstacle);
                currentObstacles.push(newObstacle);
                placed = true;
            }
            attempts++;
        }
    }
}

function addMiddleFloatingBoxes() {
    const numBoxes = 4 + Math.floor(Math.random() * 6); // 4~9개로 더 늘림
    const zones = [80, 160, 240, 320]; // 4개 구역
    
    for (let i = 0; i < numBoxes; i++) {
        const width = 12 + Math.random() * 20; // 12~32 너비
        const height = 10 + Math.random() * 15; // 10~25 높이
        const x = canvas.width + i * (70 + Math.random() * 40); // 70~110픽셀 간격으로 증가 (통과 가능하게)
        
        const zoneIndex = i % zones.length;
        const baseY = zones[zoneIndex];
        const y = baseY + (Math.random() - 0.5) * 50; // 구역 내에서 변화
        
        obstacles.push({
            x: x,
            y: Math.max(40, Math.min(canvas.height - 80, y)), // 미니 장애물 피해서
            width: width,
            height: height,
            topHeight: 0,
            bottomY: canvas.height + 10,
            bottomHeight: 0,
            passed: false,
            type: 'floating',
            color: getRandomRockColor() // 공중 장애물은 돌 색상
        });
    }
}

function addMiddleMixedPattern() {
    // 동그라미와 박스를 섞어서 배치
    const numObstacles = 5 + Math.floor(Math.random() * 6); // 5~10개로 더 늘림
    const zones = [90, 180, 270]; // 3개 구역
    
    for (let i = 0; i < numObstacles; i++) {
        const x = canvas.width + i * (75 + Math.random() * 35); // 75~110픽셀 간격으로 증가 (통과 가능하게)
        const zoneIndex = i % zones.length;
        const baseY = zones[zoneIndex];
        const y = baseY + (Math.random() - 0.5) * 70;
        
        if (Math.random() < 0.5) {
            // 동그라미 (돌)
            const radius = 10 + Math.random() * 15;
            obstacles.push({
                x: x,
                y: Math.max(40, Math.min(canvas.height - 80, y)),
                radius: radius,
                width: radius * 2,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'circle',
                color: getRandomRockColor() // 공중 장애물은 돌 색상
            });
        } else {
            // 박스 (돌)
            const width = 10 + Math.random() * 18;
            const height = 8 + Math.random() * 12;
            obstacles.push({
                x: x,
                y: Math.max(40, Math.min(canvas.height - 80, y)),
                width: width,
                height: height,
                topHeight: 0,
                bottomY: canvas.height + 10,
                bottomHeight: 0,
                passed: false,
                type: 'floating',
                color: getRandomRockColor() // 공중 장애물은 돌 색상
            });
        }
    }
}

function getRandomObstacleColor() {
    const colors = ['#1B5E20', '#2E7D32', '#388E3C', '#43A047', '#4CAF50', '#2D5016', '#33691E', '#689F38']; // 진한 선인장 녹색 계열
    return colors[Math.floor(Math.random() * colors.length)];
}

function getRandomRockColor() {
    const colors = ['#8E8E8E', '#A0A0A0', '#909090', '#7A7A7A', '#696969', '#BABABA', '#C0C0C0']; // 회색 바위 계열
    return colors[Math.floor(Math.random() * colors.length)];
}

// 색상 밝기 조절 함수
function adjustBrightness(color, brightness) {
    // hex 색상을 RGB로 변환
    const hex = color.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // 밝기 조절
    const newR = Math.max(0, Math.min(255, Math.floor(r * brightness)));
    const newG = Math.max(0, Math.min(255, Math.floor(g * brightness)));
    const newB = Math.max(0, Math.min(255, Math.floor(b * brightness)));
    
    // RGB를 hex로 변환
    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// 장애물 그리기
function drawObstacles() {
    obstacles.forEach(obstacle => {
        ctx.fillStyle = obstacle.color;
        
        if (obstacle.type === 'bird') {
            // 새 그리기 (앞쪽을 바라보도록 수정)
            const centerX = obstacle.x + obstacle.width / 2;
            const centerY = obstacle.y + obstacle.height / 2;
            
            // 검은색 새인지 확인
            const isBlackBird = obstacle.isBlackBird;
            
            // 날개 펄럭임 애니메이션
            obstacle.wingPhase += 0.3;
            const wingOffset = Math.sin(obstacle.wingPhase) * 3;
            
            // 새 몸체 (타원형)
            ctx.fillStyle = obstacle.color;
            ctx.beginPath();
            ctx.ellipse(centerX, centerY, obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 새 머리 (왼쪽에 위치)
            ctx.beginPath();
            ctx.arc(centerX - obstacle.width/3, centerY, obstacle.height/3, 0, Math.PI * 2);
            ctx.fill();
            
            // 부리 (뾰족하게 왼쪽으로)
            if (isBlackBird) {
                // 검은색 새의 부리 (노란색)
                ctx.fillStyle = '#FFD700'; // 금색
                ctx.beginPath();
                ctx.moveTo(centerX - obstacle.width/2 - 1, centerY);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY - 3);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY + 3);
                ctx.closePath();
                ctx.fill();
                
                // 부리 하이라이트 (밝은 노란색)
                ctx.fillStyle = '#FFFF00'; // 밝은 노란색
                ctx.beginPath();
                ctx.moveTo(centerX - obstacle.width/2 - 2, centerY - 1);
                ctx.lineTo(centerX - obstacle.width/2 - 10, centerY - 2);
                ctx.lineTo(centerX - obstacle.width/2 - 10, centerY + 2);
                ctx.lineTo(centerX - obstacle.width/2 - 2, centerY + 1);
                ctx.closePath();
                ctx.fill();
                
                // 부리 끝부분 하이라이트
                ctx.fillStyle = '#FFA500'; // 주황색
                ctx.beginPath();
                ctx.moveTo(centerX - obstacle.width/2 - 10, centerY - 2);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY - 3);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY + 3);
                ctx.lineTo(centerX - obstacle.width/2 - 10, centerY + 2);
                ctx.closePath();
                ctx.fill();
            } else {
                // 일반 새의 부리 (주황색)
                ctx.fillStyle = '#FF8C00'; // 진한 주황색
                ctx.beginPath();
                ctx.moveTo(centerX - obstacle.width/2 - 1, centerY);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY - 3);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY + 3);
                ctx.closePath();
                ctx.fill();
                
                // 부리 하이라이트 (뾰족한 부분)
                ctx.fillStyle = '#FFD700'; // 금색
                ctx.beginPath();
                ctx.moveTo(centerX - obstacle.width/2 - 2, centerY - 1);
                ctx.lineTo(centerX - obstacle.width/2 - 10, centerY - 2);
                ctx.lineTo(centerX - obstacle.width/2 - 10, centerY + 2);
                ctx.lineTo(centerX - obstacle.width/2 - 2, centerY + 1);
                ctx.closePath();
                ctx.fill();
                
                // 부리 끝부분 하이라이트
                ctx.fillStyle = '#FFA500'; // 주황색
                ctx.beginPath();
                ctx.moveTo(centerX - obstacle.width/2 - 10, centerY - 2);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY - 3);
                ctx.lineTo(centerX - obstacle.width/2 - 12, centerY + 3);
                ctx.lineTo(centerX - obstacle.width/2 - 10, centerY + 2);
                ctx.closePath();
                ctx.fill();
            }
            
            // 눈 (왼쪽에 명확하게 배치)
            if (isBlackBird) {
                // 검은색 새의 눈 (빨간색)
                ctx.fillStyle = '#FF0000'; // 빨간색
                ctx.beginPath();
                ctx.arc(centerX - obstacle.width/3 - 5, centerY - 3, 3, 0, Math.PI * 2);
                ctx.fill();
                
                // 눈 하이라이트 (밝은 빨간색)
                ctx.fillStyle = '#FF6666'; // 밝은 빨간색
                ctx.beginPath();
                ctx.arc(centerX - obstacle.width/3 - 6, centerY - 3, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 눈 하이라이트 (왼쪽을 바라보는 느낌)
                ctx.fillStyle = '#FFFFFF'; // 흰색
                ctx.beginPath();
                ctx.arc(centerX - obstacle.width/3 - 6.5, centerY - 3.5, 0.8, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 일반 새의 눈 (기존과 동일)
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(centerX - obstacle.width/3 - 5, centerY - 3, 3, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = 'black';
                ctx.beginPath();
                ctx.arc(centerX - obstacle.width/3 - 6, centerY - 3, 2, 0, Math.PI * 2);
                ctx.fill();
                
                // 눈 하이라이트 (왼쪽을 바라보는 느낌)
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.arc(centerX - obstacle.width/3 - 6.5, centerY - 3.5, 0.8, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 날개 (펄럭이는 효과, 앞쪽을 향하도록)
            if (isBlackBird) {
                // 검은색 새의 날개 (검은색)
                ctx.fillStyle = '#1A1A1A'; // 진한 검은색
                ctx.beginPath();
                ctx.ellipse(centerX - obstacle.width/6, centerY + wingOffset, obstacle.width/4, obstacle.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.ellipse(centerX + obstacle.width/6, centerY - wingOffset, obstacle.width/4, obstacle.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 일반 새의 날개 (기존과 동일)
                ctx.fillStyle = darkenColor(obstacle.color, 0.2);
                ctx.beginPath();
                ctx.ellipse(centerX - obstacle.width/6, centerY + wingOffset, obstacle.width/4, obstacle.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.beginPath();
                ctx.ellipse(centerX + obstacle.width/6, centerY - wingOffset, obstacle.width/4, obstacle.height/2, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 꼬리 (오른쪽에 위치)
            if (isBlackBird) {
                // 검은색 새의 꼬리 (검은색)
                ctx.fillStyle = '#1A1A1A'; // 진한 검은색
                ctx.beginPath();
                ctx.moveTo(centerX + obstacle.width/2, centerY);
                ctx.lineTo(centerX + obstacle.width/2 + 10, centerY - 4);
                ctx.lineTo(centerX + obstacle.width/2 + 8, centerY + 4);
                ctx.closePath();
                ctx.fill();
                
                // 꼬리 깃털 디테일 (검은색)
                ctx.fillStyle = '#0D0D0D'; // 더 진한 검은색
                ctx.beginPath();
                ctx.moveTo(centerX + obstacle.width/2 + 2, centerY - 2);
                ctx.lineTo(centerX + obstacle.width/2 + 6, centerY - 3);
                ctx.lineTo(centerX + obstacle.width/2 + 4, centerY + 1);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(centerX + obstacle.width/2 + 2, centerY + 2);
                ctx.lineTo(centerX + obstacle.width/2 + 6, centerY + 3);
                ctx.lineTo(centerX + obstacle.width/2 + 4, centerY - 1);
                ctx.closePath();
                ctx.fill();
            } else {
                // 일반 새의 꼬리 (기존과 동일)
                ctx.beginPath();
                ctx.moveTo(centerX + obstacle.width/2, centerY);
                ctx.lineTo(centerX + obstacle.width/2 + 10, centerY - 4);
                ctx.lineTo(centerX + obstacle.width/2 + 8, centerY + 4);
                ctx.closePath();
                ctx.fill();
                
                // 꼬리 깃털 디테일
                ctx.fillStyle = darkenColor(obstacle.color, 0.3);
                ctx.beginPath();
                ctx.moveTo(centerX + obstacle.width/2 + 2, centerY - 2);
                ctx.lineTo(centerX + obstacle.width/2 + 6, centerY - 3);
                ctx.lineTo(centerX + obstacle.width/2 + 4, centerY + 1);
                ctx.closePath();
                ctx.fill();
                
                ctx.beginPath();
                ctx.moveTo(centerX + obstacle.width/2 + 2, centerY + 2);
                ctx.lineTo(centerX + obstacle.width/2 + 6, centerY + 3);
                ctx.lineTo(centerX + obstacle.width/2 + 4, centerY - 1);
                ctx.closePath();
                ctx.fill();
            }
            
        } else if (obstacle.type === 'spike') {
            // 선인장 (세로형)
            const cactusWidth = obstacle.width;
            const cactusHeight = obstacle.height;
            
            // 선인장 몸통
            ctx.fillRect(obstacle.x + cactusWidth * 0.3, obstacle.y, cactusWidth * 0.4, cactusHeight);
            
            // 선인장 가지들
            if (cactusHeight > 15) {
                // 왼쪽 가지
                ctx.fillRect(obstacle.x, obstacle.y + cactusHeight * 0.3, cactusWidth * 0.4, cactusHeight * 0.2);
                // 오른쪽 가지
                ctx.fillRect(obstacle.x + cactusWidth * 0.6, obstacle.y + cactusHeight * 0.6, cactusWidth * 0.4, cactusHeight * 0.25);
            }
            
            // 선인장 가시들 (작은 점들) - 고정 위치
            ctx.fillStyle = darkenColor(obstacle.color);
            for (let i = 0; i < 8; i++) {
                const dotX = obstacle.x + cactusWidth * 0.4 + (i % 2) * cactusWidth * 0.2;
                const dotY = obstacle.y + (i / 8) * cactusHeight;
                ctx.fillRect(dotX, dotY, 1, 2);
            }
            
        } else if (obstacle.type === 'ground_block') {
            // 둥근 선인장
            const cactusWidth = obstacle.width;
            const cactusHeight = obstacle.height;
            
            // 선인장 몸통 (둥근 형태)
            ctx.beginPath();
            ctx.ellipse(obstacle.x + cactusWidth/2, obstacle.y + cactusHeight/2, cactusWidth/2, cactusHeight/2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 선인장 가시들
            ctx.fillStyle = darkenColor(obstacle.color);
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const dotX = obstacle.x + cactusWidth/2 + Math.cos(angle) * (cactusWidth * 0.3);
                const dotY = obstacle.y + cactusHeight/2 + Math.sin(angle) * (cactusHeight * 0.3);
                ctx.fillRect(dotX, dotY, 1, 2);
            }
            
        } else if (obstacle.type === 'ground_circle') {
            // 원형 선인장
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.radius, obstacle.y + obstacle.radius, obstacle.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 선인장 가시들 (원형 배치)
            ctx.fillStyle = darkenColor(obstacle.color);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * Math.PI * 2;
                const spikeX = obstacle.x + obstacle.radius + Math.cos(angle) * obstacle.radius * 0.8;
                const spikeY = obstacle.y + obstacle.radius + Math.sin(angle) * obstacle.radius * 0.8;
                ctx.fillRect(spikeX - 0.5, spikeY - 1, 1, 2);
            }
            
        } else if (obstacle.type === 'cactus') {
            // 실제 선인장 모양 (가지가 있는 형태)
            const mainWidth = obstacle.width * 0.6; // 메인 몸통은 좀 더 얇게
            const mainX = obstacle.x + (obstacle.width - mainWidth) / 2;
            
            // 메인 몸통
            ctx.fillRect(mainX, obstacle.y, mainWidth, obstacle.height);
            
            // 왼쪽 가지 (몸통 중간 정도에서)
            const leftBranchY = obstacle.y + obstacle.height * 0.4;
            const leftBranchWidth = obstacle.width * 0.4;
            const leftBranchHeight = obstacle.height * 0.3;
            ctx.fillRect(obstacle.x, leftBranchY, leftBranchWidth + mainWidth/2, mainWidth * 0.8);
            ctx.fillRect(obstacle.x, leftBranchY, mainWidth * 0.8, leftBranchHeight);
            
            // 오른쪽 가지 (왼쪽보다 약간 위에)
            const rightBranchY = obstacle.y + obstacle.height * 0.3;
            const rightBranchWidth = obstacle.width * 0.4;
            const rightBranchHeight = obstacle.height * 0.25;
            const rightBranchX = mainX + mainWidth/2;
            ctx.fillRect(rightBranchX, rightBranchY, rightBranchWidth, mainWidth * 0.8);
            ctx.fillRect(mainX + mainWidth - mainWidth * 0.8, rightBranchY, mainWidth * 0.8, rightBranchHeight);
            
            // 선인장 가시들 (메인 몸통) - 고정 위치
            ctx.fillStyle = darkenColor(obstacle.color);
            const numMainSpikes = Math.floor(obstacle.height / 8);
            for (let j = 0; j < numMainSpikes; j++) {
                const spikeX = mainX + mainWidth * 0.3 + (j % 2) * mainWidth * 0.4; // 고정된 패턴
                const spikeY = obstacle.y + j * 8 + 4;
                ctx.fillRect(spikeX - 1, spikeY - 1, 2, 2); // 작은 점 가시
            }
            
            // 왼쪽 가지 가시들 - 고정 위치
            for (let j = 0; j < 3; j++) {
                const spikeX = obstacle.x + leftBranchWidth * 0.3 + j * leftBranchWidth * 0.2;
                const spikeY = leftBranchY + leftBranchHeight * 0.5;
                ctx.fillRect(spikeX - 0.5, spikeY - 0.5, 1, 1);
            }
            
            // 오른쪽 가지 가시들 - 고정 위치
            for (let j = 0; j < 3; j++) {
                const spikeX = rightBranchX + rightBranchWidth * 0.2 + j * rightBranchWidth * 0.3;
                const spikeY = rightBranchY + rightBranchHeight * 0.4;
                ctx.fillRect(spikeX - 0.5, spikeY - 0.5, 1, 1);
            }
            
        } else if (obstacle.type === 'mini_cactus') {
            // 작은 실제 선인장 모양
            const mainWidth = obstacle.width * 0.7;
            const mainX = obstacle.x + (obstacle.width - mainWidth) / 2;
            
            // 메인 몸통
            ctx.fillRect(mainX, obstacle.y, mainWidth, obstacle.height);
            
            // 왼쪽 작은 가지 (하나만)
            const branchY = obstacle.y + obstacle.height * 0.5;
            const branchWidth = obstacle.width * 0.3;
            const branchHeight = obstacle.height * 0.4;
            ctx.fillRect(obstacle.x, branchY, branchWidth + mainWidth/2, mainWidth * 0.7);
            ctx.fillRect(obstacle.x, branchY, mainWidth * 0.7, branchHeight);
            
            // 작은 가시들 - 고정 위치
            ctx.fillStyle = darkenColor(obstacle.color);
            const numSpikes = Math.floor(obstacle.height / 5);
            for (let j = 0; j < numSpikes; j++) {
                const spikeX = mainX + mainWidth * 0.3 + (j % 2) * mainWidth * 0.4; // 고정된 패턴
                const spikeY = obstacle.y + j * 5 + 2;
                ctx.fillRect(spikeX - 0.5, spikeY - 0.5, 1, 1);
            }
            
        } else if (obstacle.type === 'ceiling_spike') {
            // 천장 삼각형 고드름 (아래로 뾰족)
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height); // 아래 끝
            ctx.lineTo(obstacle.x, obstacle.y); // 왼쪽 위
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y); // 오른쪽 위
            ctx.closePath();
            ctx.fill();
            
            // 고드름 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 2;
            ctx.stroke();
            
        } else if (obstacle.type === 'ceiling_block') {
            // 천장 사각형 블록
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // 블록 패턴
            ctx.fillStyle = darkenColor(obstacle.color);
            ctx.fillRect(obstacle.x + 2, obstacle.y + 2, obstacle.width - 4, obstacle.height - 4);
            
            // 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 2;
            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
        } else if (obstacle.type === 'ceiling_circle') {
            // 천장 원형 돌덩이
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.radius, obstacle.y + obstacle.radius, obstacle.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 돌덩이 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 2;
            ctx.stroke();
            
            // 돌덩이 안쪽 패턴
            ctx.fillStyle = darkenColor(obstacle.color);
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.radius, obstacle.y + obstacle.radius, obstacle.radius * 0.6, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (obstacle.type === 'mini_spike') {
            // 미니 선인장 (세로형)
            const miniWidth = obstacle.width;
            const miniHeight = obstacle.height;
            
            // 미니 선인장 몸통
            ctx.fillRect(obstacle.x + miniWidth * 0.3, obstacle.y, miniWidth * 0.4, miniHeight);
            
            // 미니 선인장 가시들 - 고정 위치
            ctx.fillStyle = darkenColor(obstacle.color);
            for (let i = 0; i < 3; i++) {
                const dotX = obstacle.x + miniWidth * 0.5;
                const dotY = obstacle.y + (i + 1) * miniHeight * 0.25;
                ctx.fillRect(dotX, dotY, 0.5, 1);
            }
            
        } else if (obstacle.type === 'mini_block') {
            // 미니 둥근 선인장
            ctx.beginPath();
            ctx.ellipse(obstacle.x + obstacle.width/2, obstacle.y + obstacle.height/2, obstacle.width/2, obstacle.height/2, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 미니 선인장 가시들
            ctx.fillStyle = darkenColor(obstacle.color);
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const dotX = obstacle.x + obstacle.width/2 + Math.cos(angle) * (obstacle.width * 0.3);
                const dotY = obstacle.y + obstacle.height/2 + Math.sin(angle) * (obstacle.height * 0.3);
                ctx.fillRect(dotX, dotY, 0.5, 1);
            }
            
        } else if (obstacle.type === 'mini_ground_circle') {
            // 미니 원형 선인장
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.radius, obstacle.y + obstacle.radius, obstacle.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 미니 선인장 가시들
            ctx.fillStyle = darkenColor(obstacle.color);
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2;
                const spikeX = obstacle.x + obstacle.radius + Math.cos(angle) * obstacle.radius * 0.7;
                const spikeY = obstacle.y + obstacle.radius + Math.sin(angle) * obstacle.radius * 0.7;
                ctx.fillRect(spikeX - 0.25, spikeY - 0.5, 0.5, 1);
            }
            
        } else if (obstacle.type === 'mini_ceiling_spike') {
            // 미니 천장 고드름 (아래로 뾰족)
            ctx.beginPath();
            ctx.moveTo(obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height); // 아래 끝
            ctx.lineTo(obstacle.x, obstacle.y); // 왼쪽 위
            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y); // 오른쪽 위
            ctx.closePath();
            ctx.fill();
            
            // 미니 고드름 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 1;
            ctx.stroke();
            
        } else if (obstacle.type === 'mini_ceiling_block') {
            // 미니 천장 블록
            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
            // 미니 천장 블록 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 1;
            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
            
        } else if (obstacle.type === 'mini_ceiling_circle') {
            // 미니 천장 원형 돌
            ctx.beginPath();
            ctx.arc(obstacle.x + obstacle.radius, obstacle.y + obstacle.radius, obstacle.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 미니 천장 돌 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 1;
            ctx.stroke();
            
        } else {
            // 기존 위아래 장애물들
            // 위쪽 장애물
            if (obstacle.topHeight > 0) {
                ctx.fillRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
                
                // 장애물에 패턴 추가
                ctx.fillStyle = darkenColor(obstacle.color);
                for (let i = 0; i < obstacle.topHeight; i += 15) {
                    ctx.fillRect(obstacle.x + 2, i + 2, obstacle.width - 4, 8);
                }
                ctx.fillStyle = obstacle.color;
            }
            
            // 아래쪽 장애물
            if (obstacle.bottomHeight > 0) {
                ctx.fillRect(obstacle.x, obstacle.bottomY, obstacle.width, obstacle.bottomHeight);
                
                // 장애물에 패턴 추가
                ctx.fillStyle = darkenColor(obstacle.color);
                for (let i = obstacle.bottomY; i < canvas.height; i += 15) {
                    ctx.fillRect(obstacle.x + 2, i + 2, obstacle.width - 4, 8);
                }
                ctx.fillStyle = obstacle.color;
            }
            
            // 장애물 테두리
            ctx.strokeStyle = darkenColor(obstacle.color);
            ctx.lineWidth = 2;
            if (obstacle.topHeight > 0) {
                ctx.strokeRect(obstacle.x, 0, obstacle.width, obstacle.topHeight);
            }
            if (obstacle.bottomHeight > 0) {
                ctx.strokeRect(obstacle.x, obstacle.bottomY, obstacle.width, obstacle.bottomHeight);
            }
        }
    });
}

function darkenColor(color) {
    // 색상을 어둡게 만드는 함수
    const colorMap = {
        '#FF5722': '#D32F2F',
        '#E91E63': '#C2185B',
        '#9C27B0': '#7B1FA2',
        '#673AB7': '#512DA8',
        '#3F51B5': '#303F9F',
        '#F44336': '#D32F2F',
        '#FF9800': '#F57C00'
    };
    return colorMap[color] || '#D32F2F';
}

// 게임 오버 파티클 효과 생성
function createParticles(x, y) {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: x,
            y: y,
            velocityX: (Math.random() - 0.5) * 10,
            velocityY: (Math.random() - 0.5) * 10,
            life: 30,
            maxLife: 30,
            color: `hsl(${Math.random() * 60 + 15}, 100%, 50%)`,
            type: 'explosion',
            size: 3
        });
    }
}

// 방귀 가스 파티클 생성 (부드러운 연속 효과)
function createGasParticles(x, y) {
    const gasCount = 1; // 가스 입자 개수 1개로 줄임 (매우 부드럽게)
    for (let i = 0; i < gasCount; i++) {
        // 아주 좁은 각도로 거의 수직 아래 (85-95도, 10도 범위)
        const angle = Math.PI * 0.47 + Math.random() * Math.PI * 0.06; // 85-95도
        const speed = Math.random() * 2 + 1.5; // 속도 1.5-3.5
        
        particles.push({
            x: x - 5 + (Math.random() - 0.5) * 2, // 캐릭터 뒤쪽(왼쪽)에서 생성
            y: y + (Math.random() - 0.5) * 3, // 캐릭터 중심 주변
            velocityX: -60 + Math.random() * 30, // 왼쪽으로 이동 (-60 ~ -30)
            velocityY: (Math.random() - 0.5) * 20, // 약간의 위아래 움직임
            life: 10 + Math.random() * 5, // 10-15프레임으로 더 짧게
            maxLife: 15,
            size: Math.random() * 3 + 1, // 크기 1-4로 작게
            opacity: Math.random() * 0.6 + 0.4, // 투명도 0.4-1.0
            color: 'rgba(255, 255, 255, ', // 흰색
            type: 'gas',
            expansion: Math.random() * 0.2 + 0.95 // 거의 크기 변화 없음
        });
    }
    
    // 아주 작은 구름 (매 3프레임마다 1개씩만)
    if (frameCount % 3 === 0) {
        particles.push({
            x: x - 8 + (Math.random() - 0.5) * 3, // 캐릭터 뒤쪽(왼쪽)에서 생성
            y: y + (Math.random() - 0.5) * 4, // 캐릭터 중심 주변
            velocityX: -40 + Math.random() * 20, // 왼쪽으로 이동 (-40 ~ -20)
            velocityY: (Math.random() - 0.5) * 15, // 약간의 위아래 움직임
            life: 12 + Math.random() * 8, // 12-20프레임으로 더 짧게
            maxLife: 20,
            size: Math.random() * 4 + 2, // 작은 구름 2-6
            opacity: Math.random() * 0.5 + 0.3,
            color: 'rgba(255, 255, 255, ', // 흰색
            type: 'gas_cloud',
            expansion: Math.random() * 0.1 + 0.9 // 거의 변화 없음
        });
    }
    
    // 아주 얇은 가스 선 몇 개
    for (let i = 0; i < 2; i++) {
        const angle = Math.PI * 0.5 + (Math.random() - 0.5) * 0.1; // 거의 완전 수직
        const speed = Math.random() * 3 + 2;
        
        particles.push({
            x: x - 10 + (Math.random() - 0.5) * 2, // 캐릭터 뒤쪽(왼쪽)에서 생성
            y: y + (Math.random() - 0.5) * 2, // 캐릭터 중심 주변
            velocityX: -80 + Math.random() * 40, // 왼쪽으로 빠르게 이동 (-80 ~ -40)
            velocityY: (Math.random() - 0.5) * 10, // 약간의 위아래 움직임
            life: 8 + Math.random() * 5, // 8-13프레임으로 더 짧게
            maxLife: 13,
            size: Math.random() * 2 + 1, // 아주 얇은 선 1-3
            opacity: Math.random() * 0.7 + 0.3,
            color: 'rgba(255, 255, 255, ', // 흰색
            type: 'gas_stream',
            expansion: Math.random() * 0.1 + 0.95 // 거의 변화 없음
        });
    }
}


// 파티클 업데이트 및 그리기 (시간 기반)
function updateParticles() {
    const currentTime = Date.now();
    const deltaTime = Math.max(currentTime - lastFrameTime, 1);
    
    // 성능 최적화: 파티클 수 제한
    if (particles.length > MAX_PARTICLES) {
        particles = particles.slice(-MAX_PARTICLES);
    }
    
    particles.forEach((particle, index) => {
        // 시간 기반 이동
        particle.x += particle.velocityX * (deltaTime / 16.67); // 60fps 기준 정규화
        particle.y += particle.velocityY * (deltaTime / 16.67);
        particle.life -= deltaTime / 16.67; // 시간 기반 수명 감소
        
        const alpha = particle.life / particle.maxLife;
        ctx.save();
        
        if (particle.type === 'gas' || particle.type === 'gas_cloud' || particle.type === 'gas_stream') {
            // 가스 파티클 처리
            if (particle.expansion) {
                const expansionRate = Math.pow(particle.expansion, deltaTime / 16.67); // 시간 기반 확장
                particle.size *= expansionRate; // 점점 커짐
                const velocityDecay = Math.pow(0.96, deltaTime / 16.67); // 시간 기반 감속
                particle.velocityY *= velocityDecay; // 중력 영향으로 점점 빨라짐
                particle.velocityX *= Math.pow(0.98, deltaTime / 16.67); // 수평 움직임은 줄어듦
            }
            
            const gasAlpha = alpha * (particle.opacity || 0.5);
            ctx.globalAlpha = gasAlpha;
            ctx.fillStyle = particle.color + gasAlpha + ')';
            
            // 가스 모양별로 그리기
            if (particle.type === 'gas_cloud') {
                // 큰 구름은 여러 원으로 구성
                const numBubbles = 4;
                for (let i = 0; i < numBubbles; i++) {
                    const offsetX = (Math.random() - 0.5) * particle.size * 0.6;
                    const offsetY = (Math.random() - 0.5) * particle.size * 0.4;
                    const bubbleSize = particle.size * (0.5 + Math.random() * 0.5);
                    
                    ctx.beginPath();
                    ctx.arc(particle.x + offsetX, particle.y + offsetY, bubbleSize, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (particle.type === 'gas_stream') {
                // 세로로 길쭉한 가스 선
                ctx.beginPath();
                ctx.ellipse(particle.x, particle.y, particle.size * 0.7, particle.size * 1.5, 0, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 일반 가스는 단일 원
                ctx.beginPath();
                ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
                ctx.fill();
            }
            
        } else {
            // 폭발 파티클 (게임 오버용)
            ctx.globalAlpha = alpha;
            ctx.fillStyle = particle.color;
            ctx.beginPath();
            ctx.arc(particle.x, particle.y, particle.size || 3, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
        
        if (particle.life <= 0) {
            particles.splice(index, 1);
        }
    });
}

// 경계 처리 (바닥/천장)
function handleBoundaries() {
    // 바닥에 닿으면 그 자리에서 멈춤
    if (player.y + player.height > canvas.height) {
        player.y = canvas.height - player.height;
        player.velocityY = 0;
    }
    
    // 천장에 닿으면 위치만 조정하고 떨어지게 함
    if (player.y < 0) {
        player.y = 0;
        if (player.velocityY < 0) {
            player.velocityY = 0;
        }
    }
}

// 아이템 충돌 감지
function checkItemCollision() {
    items.forEach(item => {
        if (!item.collected) {
            // 플레이어와 아이템 충돌 감지
            if (player.x < item.x + item.width &&
                player.x + player.width > item.x &&
                player.y < item.y + item.height &&
                player.y + player.height > item.y) {
                
                // 아이템 수집
                item.collected = true;
                
                // 아이템 수집 사운드 재생
                audio.play('itemCollectSound');
                
                if (item.type === 'invincible') {
                    // 무적 상태 활성화
                    invincible = true;
                    invincibleTimer = invincibleDuration;
                    
                    // 무적 효과 파티클 생성
                    createInvincibleParticles();
                }
            }
        }
    });
}

// 무적 효과 파티클 생성
function createInvincibleParticles() {
    for (let i = 0; i < 15; i++) {
        particles.push({
            x: player.x + player.width/2,
            y: player.y + player.height/2,
            velocityX: (Math.random() - 0.5) * 8,
            velocityY: (Math.random() - 0.5) * 8,
            life: 30,
            maxLife: 30,
            size: Math.random() * 4 + 2,
            opacity: 1,
            color: 'rgba(255, 215, 0, ', // 금색
            type: 'invincible_sparkle'
        });
    }
}

// 충돌 감지 (장애물만)
function checkCollision() {
    // 무적 상태일 때는 충돌하지 않음
    if (invincible) {
        return false;
    }
    
    // 장애물과 충돌
    for (let obstacle of obstacles) {
        if (obstacle.type === 'spike' || obstacle.type === 'ground_block' || 
            obstacle.type === 'cactus' || obstacle.type === 'mini_cactus') {
            // 바닥 장애물과 충돌 감지 (선인장 포함)
            if (player.x + player.width > obstacle.x && 
                player.x < obstacle.x + obstacle.width &&
                player.y + player.height > obstacle.y &&
                player.y < obstacle.y + obstacle.height) {
                return true;
            }
            
        } else if (obstacle.type === 'ground_circle') {
            // 바닥 원형 바위와 충돌 감지
            const circleX = obstacle.x + obstacle.radius;
            const circleY = obstacle.y + obstacle.radius;
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            
            const distance = Math.sqrt(
                (circleX - playerCenterX) * (circleX - playerCenterX) + 
                (circleY - playerCenterY) * (circleY - playerCenterY)
            );
            
            if (distance < obstacle.radius + Math.min(player.width, player.height) / 2) {
                return true;
            }
            
        } else if (obstacle.type === 'ceiling_spike' || obstacle.type === 'ceiling_block') {
            // 천장 장애물과 충돌 감지
            if (player.x + player.width > obstacle.x && 
                player.x < obstacle.x + obstacle.width &&
                player.y + player.height > obstacle.y &&
                player.y < obstacle.y + obstacle.height) {
                return true;
            }
            
        } else if (obstacle.type === 'ceiling_circle') {
            // 천장 원형 돌덩이와 충돌 감지
            const circleX = obstacle.x + obstacle.radius;
            const circleY = obstacle.y + obstacle.radius;
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            
            const distance = Math.sqrt(
                (circleX - playerCenterX) * (circleX - playerCenterX) + 
                (circleY - playerCenterY) * (circleY - playerCenterY)
            );
            
            if (distance < obstacle.radius + Math.min(player.width, player.height) / 2) {
                return true;
            }
            
        } else if (obstacle.type === 'mini_spike' || obstacle.type === 'mini_block' || 
                   obstacle.type === 'mini_ceiling_spike' || obstacle.type === 'mini_ceiling_block') {
            // 미니 장애물들과 충돌 감지 (사각형)
            if (player.x + player.width > obstacle.x && 
                player.x < obstacle.x + obstacle.width &&
                player.y + player.height > obstacle.y &&
                player.y < obstacle.y + obstacle.height) {
                return true;
            }
            
        } else if (obstacle.type === 'mini_ground_circle' || obstacle.type === 'mini_ceiling_circle') {
            // 미니 원형 장애물과 충돌 감지
            const circleX = obstacle.x + obstacle.radius;
            const circleY = obstacle.y + obstacle.radius;
            const playerCenterX = player.x + player.width / 2;
            const playerCenterY = player.y + player.height / 2;
            
            const distance = Math.sqrt(
                (circleX - playerCenterX) * (circleX - playerCenterX) + 
                (circleY - playerCenterY) * (circleY - playerCenterY)
            );
            
            if (distance < obstacle.radius + Math.min(player.width, player.height) / 2) {
                return true;
            }
            
        } else if (obstacle.type === 'bird') {
            // 새와 충돌 감지 (사각형 충돌)
            if (player.x + player.width > obstacle.x && 
                player.x < obstacle.x + obstacle.width &&
                player.y + player.height > obstacle.y &&
                player.y < obstacle.y + obstacle.height) {
                return true;
            }
            
        } else {
            // 기존 위아래 장애물과 충돌 감지
            if (player.x + player.width > obstacle.x && 
                player.x < obstacle.x + obstacle.width) {
                if ((obstacle.topHeight > 0 && player.y < obstacle.topHeight) || 
                    (obstacle.bottomHeight > 0 && player.y + player.height > obstacle.bottomY)) {
                    return true;
                }
            }
        }
    }
    
    return false;
}

// 게임 업데이트
function update() {
    if (!gameRunning) return;
    
    const currentTime = Date.now();
    const deltaTime = Math.max(currentTime - lastFrameTime, 1); // 최소 1ms 보장
    lastFrameTime = currentTime;
    
    frameCount++;
    
    // 플레이어 이동 처리
    updatePlayerMovement();
    
    // 경계 처리
    handleBoundaries();
    
    // 장애물 생성 (60프레임마다로 더 자주 생성)
    if (frameCount % 60 === 0) {
        createObstacle();
    }
    
    // 구름 생성 (60프레임마다)
    if (frameCount % 60 === 0) {
        createClouds();
    }
    
    // 아이템 생성 (120프레임마다)
    if (frameCount % 120 === 0) {
        createItems();
    }
    
    // 장애물 업데이트 - 시간 기반으로 일정한 속도
    obstacles.forEach((obstacle, index) => {
        // 새는 더 빠른 속도로 이동
        const speed = obstacle.type === 'bird' ? (obstacle.speed || OBSTACLE_SPEED * 1.5) : OBSTACLE_SPEED;
        obstacle.x -= speed * (deltaTime / 1000); // deltaTime을 초 단위로 변환
        
        // 검은색 새의 위아래 움직임 처리
        if (obstacle.type === 'bird' && obstacle.isBlackBird) {
            obstacle.floatPhase += obstacle.floatSpeed;
            const floatOffset = Math.sin(obstacle.floatPhase) * obstacle.floatAmplitude;
            obstacle.y = obstacle.y + floatOffset * (deltaTime / 1000) * 60; // 60fps 기준으로 정규화
        }
        
        // 점수 증가 (장애물을 통과했을 때)
        let obstacleWidth = obstacle.width;
        if (obstacle.type === 'ground_circle' || obstacle.type === 'ceiling_circle' || 
            obstacle.type === 'mini_ground_circle' || obstacle.type === 'mini_ceiling_circle') {
            obstacleWidth = obstacle.radius * 2;
        } else if (obstacle.type === 'bird') {
            obstacleWidth = obstacle.width; // 새는 사각형이므로 width 사용
        }
        
        if (!obstacle.passed && obstacle.x + obstacleWidth < player.x) {
            obstacle.passed = true;
            score++;
            scoreElement.textContent = score;
        }
        
        // 화면 밖으로 나간 장애물 제거
        if (obstacle.x + obstacleWidth < 0) {
            obstacles.splice(index, 1);
        }
    });
    
    // 구름 업데이트
    clouds.forEach((cloud, index) => {
        cloud.x -= cloud.speed * (deltaTime / 1000);
        
        // 화면 밖으로 나간 구름 제거
        if (cloud.x + cloud.width < 0) {
            clouds.splice(index, 1);
        }
    });
    
    // 아이템 업데이트
    items.forEach((item, index) => {
        if (!item.collected) {
            item.x -= OBSTACLE_SPEED * (deltaTime / 1000);
            
            // 화면을 벗어난 아이템 제거
            if (item.x + item.width < 0) {
                items.splice(index, 1);
            }
        } else {
            // 수집된 아이템 제거
            items.splice(index, 1);
        }
    });
    
    // 무적 상태 업데이트
    if (invincible) {
        invincibleTimer--;
        if (invincibleTimer <= 0) {
            invincible = false;
        }
    }
    
    // 구름 충돌 확인 및 안개 효과
    if (checkCloudCollision()) {
        fogEffect = 1.0; // 즉시 최대 안개
        fogTimer = fogDuration; // 3초 타이머 리셋
        cloudTimer++; // 구름 안에 있는 시간 증가
        
        // 1.5초 동안 구름에 있으면 게임 오버
        if (cloudTimer >= cloudDuration) {
            gameOver();
            return;
        }
    } else {
        cloudTimer = 0; // 구름 밖으로 나가면 타이머 리셋
        if (fogTimer > 0) {
            fogTimer--; // 타이머 감소
            fogEffect = 1.0; // 타이머 동안 최대 안개 유지
        } else {
            fogEffect = Math.max(fogEffect - fogDecayRate * 3, 0); // 빠르게 안개 감소
        }
    }
    
    // 아이템 충돌 감지
    checkItemCollision();
    
    // 충돌 감지
    if (checkCollision()) {
        gameOver();
    }
}

// 게임 그리기
function draw() {
    // 배경 지우기
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 점수에 따른 낮/밤 배경 결정 (130점부터 서서히 전환)
    const cycle = Math.floor(score / 150); // 150점마다 1 사이클
    const cycleProgress = (score % 150) / 150; // 현재 사이클 내 진행도 (0~1)
    
    // 전환 상태 결정
    let isNight = false;
    let transitionProgress = 0;
    
    // 130점(0.867)부터 150점(1.0)까지 전환 구간
    if (cycleProgress >= 0.867) {
        // 전환 진행도 계산 (0~1)
        transitionProgress = (cycleProgress - 0.867) / (1.0 - 0.867);
        transitionProgress = Math.max(0, Math.min(1, transitionProgress));
        
        // 현재 사이클의 기본 상태 (짝수 사이클 = 낮, 홀수 사이클 = 밤)
        const baseState = cycle % 2 === 0; // false = 낮, true = 밤
        
        // 전환 중일 때는 기본 상태에서 시작해서 반대 상태로
        isNight = baseState;
    } else {
        // 전환 구간이 아닐 때는 현재 사이클 상태 유지
        isNight = cycle % 2 === 1; // 홀수 사이클 = 밤
        transitionProgress = 0;
    }
    
    // 낮 배경 그라데이션 (기본)
    const dayGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    dayGradient.addColorStop(0, '#FFE0B2'); // 하늘색 -> 사막 하늘
    dayGradient.addColorStop(0.7, '#FFCC80');
    dayGradient.addColorStop(1, '#FF8A65'); // 사막 지평선
    
    // 밤 배경 그라데이션
    const nightGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    nightGradient.addColorStop(0, '#1A1A2E'); // 어두운 하늘
    nightGradient.addColorStop(0.7, '#16213E');
    nightGradient.addColorStop(1, '#0F3460'); // 어두운 지평선
    
    // 서서히 전환되는 배경
    if (transitionProgress > 0) {
        // 전환 중일 때 두 배경을 블렌딩
        const baseState = cycle % 2 === 0; // 현재 사이클의 기본 상태
        
        if (baseState) {
            // 낮에서 밤으로 전환 (점점 어두워짐)
            ctx.fillStyle = dayGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.globalAlpha = transitionProgress;
            ctx.fillStyle = nightGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        } else {
            // 밤에서 낮으로 전환 (점점 밝아짐)
            ctx.fillStyle = nightGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.globalAlpha = transitionProgress;
            ctx.fillStyle = dayGradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    } else {
        // 전환 중이 아닐 때 - 현재 상태에 맞는 배경
        if (isNight) {
            ctx.fillStyle = nightGradient;
        } else {
            ctx.fillStyle = dayGradient;
        }
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // 태양/달 효과
    if (transitionProgress > 0) {
        // 전환 중일 때
        const baseState = cycle % 2 === 0; // 현재 사이클의 기본 상태
        
        if (baseState) {
            // 낮에서 밤으로 전환
            // 태양이 점점 사라짐
            ctx.fillStyle = `rgba(255, 193, 7, ${0.8 * (1 - transitionProgress)})`;
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
            ctx.fill();
            
            // 달과 별들이 점점 나타남
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * transitionProgress})`;
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 80, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // 달의 그림자 효과
            ctx.fillStyle = `rgba(200, 200, 200, ${0.3 * transitionProgress})`;
            ctx.beginPath();
            ctx.arc(canvas.width - 100 + 8, 80 - 8, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // 별들
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * transitionProgress})`;
            for (let i = 0; i < 20; i++) {
                const x = (i * 47) % canvas.width;
                const y = (i * 31) % 150;
                ctx.beginPath();
                ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 밤에서 낮으로 전환
            // 달과 별들이 점점 사라짐
            ctx.fillStyle = `rgba(255, 255, 255, ${0.9 * (1 - transitionProgress)})`;
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 80, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // 달의 그림자 효과
            ctx.fillStyle = `rgba(200, 200, 200, ${0.3 * (1 - transitionProgress)})`;
            ctx.beginPath();
            ctx.arc(canvas.width - 100 + 8, 80 - 8, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // 별들
            ctx.fillStyle = `rgba(255, 255, 255, ${0.8 * (1 - transitionProgress)})`;
            for (let i = 0; i < 20; i++) {
                const x = (i * 47) % canvas.width;
                const y = (i * 31) % 150;
                ctx.beginPath();
                ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 태양이 점점 나타남
            ctx.fillStyle = `rgba(255, 193, 7, ${0.8 * transitionProgress})`;
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
            ctx.fill();
        }
    } else {
        // 전환 중이 아닐 때 - 현재 상태에 맞는 천체
        if (isNight) {
            // 밤 상태 - 달과 별들
            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 80, 35, 0, Math.PI * 2);
            ctx.fill();
            
            // 달의 그림자 효과
            ctx.fillStyle = 'rgba(200, 200, 200, 0.3)';
            ctx.beginPath();
            ctx.arc(canvas.width - 100 + 8, 80 - 8, 25, 0, Math.PI * 2);
            ctx.fill();
            
            // 별들
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            for (let i = 0; i < 20; i++) {
                const x = (i * 47) % canvas.width;
                const y = (i * 31) % 150;
                ctx.beginPath();
                ctx.arc(x, y, 1 + Math.random() * 2, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            // 낮 상태 - 태양
            ctx.fillStyle = 'rgba(255, 193, 7, 0.8)';
            ctx.beginPath();
            ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    // 사막 언덕들 - 시간 기반으로 일정한 속도
    ctx.fillStyle = isNight ? 'rgba(60, 40, 35, 0.4)' : 'rgba(121, 85, 72, 0.3)'; // 밤에는 더 어둡게
    const currentTime = Date.now();
    const timeOffset = (currentTime - gameStartTime) * 0.05; // 일정한 이동 속도
    for (let i = 0; i < 4; i++) {
        const x = (timeOffset + i * 200) % (canvas.width + 150) - 75;
        const y = canvas.height - 60 - i * 10;
        ctx.beginPath();
        ctx.ellipse(x, y, 80 + i * 20, 30 + i * 5, 0, 0, Math.PI * 2);
        ctx.fill();
    }
    
    drawPlayerTrail(); // 자취를 먼저 그리기 (플레이어 뒤에)
    drawPlayer();
    drawObstacles();
    drawClouds();
    drawItems();
    updateParticles();
    
    // 안개 효과 그리기 (매우 뿌옇게)
    if (fogEffect > 0) {
        ctx.save();
        
        // 첫 번째 안개 레이어 (진한 회색)
        ctx.globalAlpha = fogEffect * 0.9; // 90% 투명도
        ctx.fillStyle = 'rgba(180, 180, 180, 0.95)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 두 번째 안개 레이어 (연한 회색)
        ctx.globalAlpha = fogEffect * 0.7;
        ctx.fillStyle = 'rgba(220, 220, 220, 0.8)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // 세 번째 안개 레이어 (아주 연한 회색)
        ctx.globalAlpha = fogEffect * 0.5;
        ctx.fillStyle = 'rgba(240, 240, 240, 0.6)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.restore();
    }
}

// 게임 루프
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// 플레이어 이동 처리
function updatePlayerMovement() {
    if (gameRunning) {
        const currentTime = Date.now();
        const deltaTime = Math.max(currentTime - lastFrameTime, 1);
        
        if (spacePressed) {
            // 스페이스바를 누르고 있으면 위로 올라감 (부드럽게)
            player.velocityY = player.upSpeed;
            // 방귀 가스 효과 (올라갈 때) - 연속적으로 부드럽게
            createGasParticles(player.x + player.width/2, player.y + player.height);
        } else {
            // 스페이스바를 안누르면 아래로 떨어짐 (부드럽게)
            player.velocityY = player.downSpeed;
        }
        
        // 플레이어 위치 업데이트 (시간 기반으로 부드럽게)
        player.y += player.velocityY * (deltaTime / 1000);
        
        // 캐릭터 자취 추가
        updatePlayerTrail();
    }
}

// 캐릭터 자취 업데이트
function updatePlayerTrail() {
    // 현재 위치를 자취에 추가 (매 프레임마다)
    playerTrail.push({
        x: player.x + player.width/2,
        y: player.y + player.height/2,
        life: 180, // 180프레임 동안 유지 (3초, 더욱 길게)
        maxLife: 180
    });
    
    // 성능 최적화: 자취 길이 제한
    if (playerTrail.length > MAX_TRAIL_LENGTH) {
        playerTrail = playerTrail.slice(-MAX_TRAIL_LENGTH);
    }
    
    // 자취를 왼쪽으로 이동시키기 (장애물과 같은 속도)
    const currentTime = Date.now();
    const deltaTime = Math.max(currentTime - lastFrameTime, 1);
    
    playerTrail.forEach(trail => {
        trail.x -= OBSTACLE_SPEED * (deltaTime / 1000); // 장애물과 동일한 속도로 이동
        trail.life--;
    });
    
    // 화면 밖으로 나가거나 수명이 다한 자취 제거
    playerTrail = playerTrail.filter(trail => {
        return trail.life > 0 && trail.x > -50; // 화면 왼쪽 밖으로 나가면 제거
    });
}

// 캐릭터 자취 그리기
function drawPlayerTrail() {
    if (playerTrail.length < 2) return;
    
    ctx.save();
    
    // 선으로 연결된 자취 그리기 (더 두껍게)
    ctx.strokeStyle = player.color;
    ctx.lineWidth = 8; // 4 → 8로 두 배 더 두껍게
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // 투명도 그라데이션을 위해 여러 세그먼트로 나누어 그리기
    for (let i = 1; i < playerTrail.length; i++) {
        const current = playerTrail[i];
        const previous = playerTrail[i - 1];
        
        const opacity = current.life / current.maxLife;
        ctx.globalAlpha = opacity * 0.4; // 반투명
        
        ctx.beginPath();
        ctx.moveTo(previous.x, previous.y);
        ctx.lineTo(current.x, current.y);
        ctx.stroke();
    }
    
    // 추가로 점들도 그리기 (더 크고 선명한 자취)
    playerTrail.forEach((trail, index) => {
        const opacity = trail.life / trail.maxLife;
        const size = 6 * opacity; // 3 → 6으로 두 배 더 큰 점들
        
        ctx.globalAlpha = opacity * 0.6; // 0.5 → 0.6으로 더 선명하게
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(trail.x, trail.y, size, 0, Math.PI * 2);
        ctx.fill();
    });
    
    ctx.restore();
}

// 게임 오버
async function gameOver() {
    gameRunning = false;
    window.gameRunning = gameRunning; // 전역 상태 업데이트
    gameStatusElement.innerHTML = '<span class="game-over">Game Over!</span>';
    createParticles(player.x + player.width/2, player.y + player.height/2);
    
    // 게임 오버 사운드 재생
    audio.play('gameOverSound');
    // 배경음악 정지
    audio.stopMusic();
    
    // 게임 오버 패널 표시
    finalScoreElement.textContent = score;
    gameOverPanel.style.display = 'block';
    
    // 점수 저장 (로컬 스토리지 사용)
    if (window.simpleAuth) {
        const isNewRecord = window.simpleAuth.saveScore(score);
        
        if (isNewRecord) {
            document.getElementById('newRecord').style.display = 'block';
            // 새 기록 사운드 재생
            audio.play('newRecordSound');
        }
    }
}

// 게임 재시작
function restart() {
    gameRunning = true;
    window.gameRunning = gameRunning; // 전역 상태 업데이트
    
    // 배경음악 다시 시작 (음소거가 해제되어 있을 때만)
    setTimeout(() => {
        if (audio.masterVolume > 0) {
            audio.playMusic();
            console.log('Background music restarted');
        } else {
            console.log('Background music not started - muted');
        }
    }, 500); // 0.5초 후 배경음악 시작
    score = 0;
    frameCount = 0;
    player.y = 200;
    player.velocityY = 0;
    obstacles = [];
    particles = [];
    clouds = [];
    items = [];
    fogEffect = 0;
    fogTimer = 0;
    cloudTimer = 0;
    invincible = false;
    invincibleTimer = 0;
    scoreElement.textContent = '0';
    gameStatusElement.innerHTML = '';
    
    // 시간 변수 초기화
    gameStartTime = Date.now();
    lastFrameTime = Date.now();
    
    // 스페이스바 상태 초기화
    spacePressed = false;
    
    // 자취 초기화
    playerTrail = [];
    
    // 게임 오버 패널 숨기기
    gameOverPanel.style.display = 'none';
    
    // 새로운 기록 메시지 숨기기
    const newRecordElement = document.getElementById('newRecord');
    if (newRecordElement) {
        newRecordElement.style.display = 'none';
    }
}

// 이벤트 리스너
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        spacePressed = true;
        // 점프 사운드 제거 (사용자 요청)
        // audio.play('jumpSound');
    } else if (e.code === 'KeyR' && !gameRunning) {
        restart();
    }
});

document.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        spacePressed = false;
    }
});

// 터치 이벤트 리스너 (모바일 대응)
canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    touchPressed = true;
    spacePressed = true; // 터치와 스페이스바 동일하게 처리
    // 점프 사운드 제거 (사용자 요청)
    // audio.play('jumpSound');
});

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchPressed = false;
    spacePressed = false;
});

canvas.addEventListener('touchcancel', (e) => {
    e.preventDefault();
    touchPressed = false;
    spacePressed = false;
});

// 마우스 클릭 이벤트 (데스크톱에서도 클릭으로 플레이 가능)
canvas.addEventListener('mousedown', (e) => {
    e.preventDefault();
    spacePressed = true;
    // 점프 사운드 제거 (사용자 요청)
    // audio.play('jumpSound');
});

canvas.addEventListener('mouseup', (e) => {
    e.preventDefault();
    spacePressed = false;
});

// 화면 크기 변경 시 캔버스 재설정
window.addEventListener('resize', () => {
    setupCanvas();
    updateControlText();
    // 게임이 실행 중이면 재시작
    if (gameRunning) {
        restart();
    }
});

// 캔버스 마우스 이벤트 - 스페이스바와 동일하게 작동

// 다시 시작하기 버튼 클릭 이벤트
restartButton.addEventListener('click', restart);

// 모든 마우스 이벤트를 완전히 차단 (클릭 제외)
canvas.addEventListener('mousemove', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('mouseleave', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('mouseenter', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('mouseover', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('mouseout', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('mousedown', (e) => {
    // 마우스 다운은 차단하되, 클릭 이벤트는 별도 처리
    if (e.button !== 0) { // 좌클릭이 아니면 차단
        e.preventDefault();
        e.stopPropagation();
        return false;
    }
});

canvas.addEventListener('mouseup', (e) => {
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('contextmenu', (e) => {
    // 우클릭 메뉴 차단
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('wheel', (e) => {
    // 마우스 휠 차단
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('drag', (e) => {
    // 드래그 차단
    e.preventDefault();
    e.stopPropagation();
    return false;
});

canvas.addEventListener('dragstart', (e) => {
    // 드래그 시작 차단
    e.preventDefault();
    e.stopPropagation();
    return false;
});

// 캔버스 포커스 설정 및 마우스 상호작용 최소화
canvas.setAttribute('tabindex', '0');
canvas.style.outline = 'none';
canvas.style.userSelect = 'none'; // 텍스트 선택 방지
canvas.style.webkitUserSelect = 'none'; // Safari 텍스트 선택 방지
canvas.style.mozUserSelect = 'none'; // Firefox 텍스트 선택 방지
canvas.style.msUserSelect = 'none'; // IE 텍스트 선택 방지
canvas.style.webkitTouchCallout = 'none'; // iOS 컨텍스트 메뉴 방지
canvas.style.webkitUserDrag = 'none'; // 드래그 방지
canvas.style.webkitTapHighlightColor = 'transparent'; // 터치 하이라이트 방지
canvas.style.pointerEvents = 'auto'; // 클릭은 허용하되 다른 이벤트 최소화

// 게임 시작
loadSavedCharacter(); // 저장된 캐릭터 색상 불러오기
gameLoop();
