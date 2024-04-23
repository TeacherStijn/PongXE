document.addEventListener('DOMContentLoaded', fetchPlayers);

document.addEventListener('keydown', function(event) {
    const key = event.keyCode;
    const paddleSpeed = 20; // Stel de snelheid van de peddelbeweging in

    if (key === 38) { // Pijltje omhoog
        // Beweeg de peddel omhoog maar stop bij de bovenkant van het canvas
        userPaddle.y = Math.max(userPaddle.y - paddleSpeed, 0);
    } else if (key === 40) { // Pijltje omlaag
        // Beweeg de peddel omlaag maar stop bij de onderkant van het canvas
        userPaddle.y = Math.min(userPaddle.y + paddleSpeed, canvas.height - userPaddle.height);
    }
});



const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

const ball = {
    x: canvas.width / 2,
    y: canvas.height / 2,
    radius: 10,
    velocityX: 0, // Begin met geen beweging
    velocityY: 0,
    color: 'WHITE'
};

const userPaddle = {
    x: 0, 
    y: (canvas.height - 100) / 2, 
    width: 10,
    height: 100,
    score: 0,
    color: 'WHITE'
};

const aiPaddle = {
    x: canvas.width - 10, 
    y: (canvas.height - 100) / 2, 
    width: 10,
    height: 100,
    score: 0,
    color: 'WHITE'
};

let gameTimeRemaining = 30; // tijd in seconden
let gameActive = false; // Spel is niet actief tot startknop is gedrukt

function startGame() {
    const selectedPlayerAlias = document.getElementById('playerSelect').value;
    if (selectedPlayerAlias) {
        if (!gameActive) {
            gameActive = true;
            resetGame();
            updateGameTime(); // Start de game timer alleen als het spel begint
        } else {
            alert("Het spel is al begonnen. Druk opnieuw op start om het spel te resetten.");
            resetGame();
        }
    } else {
        console.log("Selecteer een speler om te beginnen.");
    }
}

function resetGame() {
    // Reset de bal naar het midden en geef het een initiële snelheid
    resetBall();
    
    // Reset de scores
    userPaddle.score = 0;
    aiPaddle.score = 0;

    // Reset de timer
    gameTimeRemaining = 30; // Reset de tijd tot de starttijd
}

document.getElementById('startButton').addEventListener('click', startGame);

function resetBall() {
    ball.x = canvas.width / 2;
    ball.y = canvas.height / 2;
    ball.velocityX = 5 * (Math.random() > 0.5 ? 1 : -1);
    ball.velocityY = 5 * (Math.random() > 0.5 ? 1 : -1);
}

function updateBall() {
    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    // Botsingsdetectie met de boven- en onderkant van het canvas
    if (ball.y + ball.radius > canvas.height || ball.y - ball.radius < 0) {
        ball.velocityY = -ball.velocityY;
    }

    // Botsing met userPaddle
    if (ball.x - ball.radius < userPaddle.x + userPaddle.width &&
        ball.y > userPaddle.y && ball.y < userPaddle.y + userPaddle.height) {
        ball.velocityX = -ball.velocityX;
    }

    // Botsing met aiPaddle
    if (ball.x + ball.radius > aiPaddle.x &&
        ball.y > aiPaddle.y && ball.y < aiPaddle.y + aiPaddle.height) {
        ball.velocityX = -ball.velocityX;
    }

    // Controleer of de bal de linker- of rechterrand van het canvas heeft gepasseerd
    if (ball.x - ball.radius < 0) {
        // AI scoort
        aiPaddle.score++;
        resetBall(); // Reset de bal naar het midden
    } else if (ball.x + ball.radius > canvas.width) {
        // Speler scoort
        userPaddle.score++;
        resetBall(); // Reset de bal naar het midden
    }
}


function drawRect(x, y, width, height, color) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y, width, height);
}

function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2, false);
    ctx.closePath();
    ctx.fill();
}

function drawText(text, x, y, color) {
    ctx.fillStyle = color;
    ctx.font = '16px Arial';
    ctx.fillText(text, x, y);
}

function draw() {
    drawRect(0, 0, canvas.width, canvas.height, 'BLACK');
    drawRect(userPaddle.x, userPaddle.y, userPaddle.width, userPaddle.height, userPaddle.color);
    drawRect(aiPaddle.x, aiPaddle.y, aiPaddle.width, aiPaddle.height, aiPaddle.color);
    drawCircle(ball.x, ball.y, ball.radius, ball.color);
    drawText("Tijd over: " + gameTimeRemaining, canvas.width / 2 - 50, 20, 'WHITE');
    drawText(userPaddle.score, 100, 30, 'WHITE');
    drawText(aiPaddle.score, canvas.width - 100, 30, 'WHITE');
    if (gameActive) {
        updateBall();
    }
}

function updateGameTime() {
    if (gameTimeRemaining > 0) {
        setTimeout(() => {
            gameTimeRemaining -= 1;
            updateGameTime();
        }, 1000);
    } else {
        alert("Spel voorbij! Scores - Jij: " + userPaddle.score + ", AI: " + aiPaddle.score);
        gameActive = false; // Zet het spel op niet actief
        ball.velocityX = 0;
        ball.velocityY = 0;
    }
}

function fetchPlayers() {
    fetch('/api/players') // Veronderstelt dat je een API endpoint hebt op /api/players
        .then(response => response.json())
        .then(data => {
            const playerSelect = document.getElementById('playerSelect');
			playerSelect.innerHTML = '';
            data.forEach(player => {
                let option = document.createElement('option');
                option.value = player.id;
                option.textContent = player.alias; // Aannemende dat 'alias' een veld is in je data
                playerSelect.appendChild(option);
            });
        })
        .catch(error => console.error('Error fetching players:', error));
}


setInterval(draw, 1000 / 60); // ongeveer 60 keer per seconde
