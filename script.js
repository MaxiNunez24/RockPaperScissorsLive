class RockPaperScissorsGame {
    constructor() {
        this.video = document.getElementById('video');
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.playerScore = 0;
        this.computerScore = 0;
        this.currentPlayerChoice = null;
        this.gameActive = true;
        this.lastGameTime = 0;
        
        this.init();
    }

    async init() {
        await this.setupCamera();
        await this.loadFaceAPI();
        this.setupHandDetection();
        this.startDetection();
    }

    async setupCamera() {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { width: 640, height: 480 } 
        });
        this.video.srcObject = stream;
        return new Promise(resolve => {
            this.video.onloadedmetadata = () => resolve();
        });
    }

    async loadFaceAPI() {
        await faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
        await faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/');
    }

    setupHandDetection() {
        this.hands = new Hands({
            locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });
        
        this.hands.setOptions({
            maxNumHands: 1,
            modelComplexity: 1,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        this.hands.onResults(results => this.onHandResults(results));
    }

    onHandResults(results) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            const gesture = this.recognizeGesture(landmarks);
            
            if (gesture && this.gameActive) {
                this.playRound(gesture);
            }
        }
    }

    recognizeGesture(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20];
        const fingerPips = [3, 6, 10, 14, 18];
        
        let fingersUp = [];
        
        // Thumb
        fingersUp.push(landmarks[fingerTips[0]].x > landmarks[fingerPips[0]].x);
        
        // Other fingers
        for (let i = 1; i < 5; i++) {
            fingersUp.push(landmarks[fingerTips[i]].y < landmarks[fingerPips[i]].y);
        }
        
        const upCount = fingersUp.filter(Boolean).length;
        
        if (upCount === 0) return 'rock';
        if (upCount === 2 && fingersUp[1] && fingersUp[2]) return 'scissors';
        if (upCount === 5) return 'paper';
        
        return null;
    }

    playRound(playerChoice) {
        if (Date.now() - this.lastGameTime < 2000) return;
        
        this.lastGameTime = Date.now();
        this.gameActive = false;
        
        const choices = ['rock', 'paper', 'scissors'];
        const computerChoice = choices[Math.floor(Math.random() * 3)];
        
        const choiceEmojis = {
            rock: '✊',
            paper: '✋',
            scissors: '✌️'
        };
        
        document.getElementById('playerChoice').textContent = `👤 You: ${choiceEmojis[playerChoice]} ${playerChoice}`;
        document.getElementById('computerChoice').textContent = `🤖 Computer: ${choiceEmojis[computerChoice]} ${computerChoice}`;
        
        const result = this.getResult(playerChoice, computerChoice);
        this.displayResult(result);
        this.updateScore(result);
        
        setTimeout(() => {
            this.gameActive = true;
            document.getElementById('playerChoice').textContent = '✋ Show your hand!';
            document.getElementById('computerChoice').textContent = '';
        }, 2000);
    }

    getResult(player, computer) {
        if (player === computer) return 'tie';
        if (
            (player === 'rock' && computer === 'scissors') ||
            (player === 'paper' && computer === 'rock') ||
            (player === 'scissors' && computer === 'paper')
        ) {
            return 'win';
        }
        return 'lose';
    }

    displayResult(result) {
        const resultElement = document.getElementById('result');
        resultElement.className = result;
        
        switch(result) {
            case 'win':
                resultElement.textContent = 'You Win! 🎉';
                break;
            case 'lose':
                resultElement.textContent = 'You Lose! 😢';
                break;
            case 'tie':
                resultElement.textContent = "It's a Tie! 🤝";
                break;
        }
    }

    updateScore(result) {
        if (result === 'win') {
            this.playerScore++;
            document.getElementById('playerScore').textContent = this.playerScore;
        } else if (result === 'lose') {
            this.computerScore++;
            document.getElementById('computerScore').textContent = this.computerScore;
        }
    }

    async detectEmotions() {
        const detections = await faceapi
            .detectAllFaces(this.video, new faceapi.TinyFaceDetectorOptions())
            .withFaceExpressions();
        
        if (detections.length > 0) {
            const expressions = detections[0].expressions;
            const emotionMessage = document.getElementById('emotionMessage');
            
            if (expressions.angry > 0.6) {
                emotionMessage.textContent = "😠 Take a deep breath! It's just a game!";
            } else if (expressions.sad > 0.6) {
                emotionMessage.textContent = "😢 Don't be sad! You'll win the next one!";
            } else if (expressions.happy > 0.7) {
                emotionMessage.textContent = "😊 Great to see you enjoying the game!";
            } else {
                emotionMessage.textContent = "";
            }
        }
    }

    startDetection() {
        const detect = async () => {
            await this.hands.send({ image: this.video });
            await this.detectEmotions();
            requestAnimationFrame(detect);
        };
        detect();
    }
}

// Start the game when page loads
window.addEventListener('load', () => {
    new RockPaperScissorsGame();
});
