const oracledb = require('oracledb');
const express = require('express');
const app = express();
const path = require('path');

const bodyParser = require('body-parser');
app.use(bodyParser.json());

const WebSocket = require('ws');
const wsServer = require('http').createServer(app);
const wss = new WebSocket.Server({ server: wsServer });

const PORT = 4242;

// Serveer statische bestanden vanuit de 'src' directory
// app.use(express.static(path.join(__dirname, 'src')));

let connection;
let loggedInUsers = [];
//let players = []; oude var voor zelf kiezen uit userlijst
let playersWaiting = []; // Lijst van wachtende spelers
let activeGames = {}; // Actieve games opgeslagen per game ID

async function initOracleConnection() {
    try {
        connection = await oracledb.getConnection({
            user: 'system',
            password: 'cursus',
            connectionString: 'localhost:1522/XE' 
        });
		//192.168.2.10:1522/XEPDB1
        console.log('Verbonden met Oracle Database');
    } catch (err) {
        console.error('Fout tijdens het verbinden met de database', err);
    }

    return connection;
}



// LOGIN functie aanroepen:

async function loginUser(username, wachtwoord) {
    
	if (connection) {
		try {
			// Hier ooit eigen login per user
			//

			// Voer de Oracle-functie uit om in te loggen en de status van de gebruiker bij te werken
			const result = await connection.execute(
				`BEGIN
					:status := game.loginUser(:username, :wachtwoord);
				 END;`,
				{
					status: { dir: oracledb.BIND_OUT, type: oracledb.STRING },
					username: { val: username, type: oracledb.STRING },
					wachtwoord: { val: wachtwoord, type: oracledb.STRING }
				},
				{ autoCommit: true }
			);

			// Controleer de status van de gebruiker
			const loginStatus = result.outBinds.status;
			if (loginStatus === 'SUCCESS') {
				
				// Gebruiker is succesvol ingelogd
				// Nog even mooier maken dan username op te slaan;
				loggedInUsers.push(username);
				playersWaiting.push(username);
				
				return { success: true, message: 'Login successful' };
			} else {
				// Gebruiker kon niet worden ingelogd
				return { success: false, message: 'Invalid username or password' };
			}
		} catch (error) {
			// Vang eventuele fouten op
			console.error(error);
			return { success: false, message: 'An error occurred while logging in' };
		} 
	}
}





// DB functie aanroepen:
async function getPlayersFromDB(aantal) {
    let result;
	
	if (connection) {
		try {
			const result = await connection.execute(
				`BEGIN
					:cursor := game.getPlayerPool(:aantalBind);
				 END;`,
				{
					cursor: { dir: oracledb.BIND_OUT, type: oracledb.CURSOR },
					aantalBind: { val: aantal, type: oracledb.NUMBER, dir: oracledb.BIND_IN }
				}
			);

			const resultSet = result.outBinds.cursor;
			const players = [];
			let row;

			while ((row = await resultSet.getRow())) {
				players.push({
					id: row[0],
					alias: row[1]
				});
			}

			await resultSet.close();
			return players;
		} catch (err) {
			console.error(err);
		} 
	}
}


// Route voor de hoofdpagina
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'index.html'));
});

// Route voor JavaScript
app.get('/pong.js', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'pong.js'));
});

app.get('/registreer.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'registreer.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'src', 'login.html'));
});

app.get('/api/players', async (req, res) => {
	// hier players[] array vullen met resultaat v/d aanroep naar 'getPlayersFromDB() functie'
	
	players = await getPlayersFromDB(10);
    res.json(players); // stuur de eerste tien spelers
});

app.post('/api/start-game', (req, res) => {
    const playerId = req.body.playerId;
    console.log('Spel gestart voor speler:', playerId);
    // Hier zou je spellogica en initialisatie komen
    res.json({ message: 'Spel gestart', playerId });
});

app.post('/login', async (req, res) => {
    const { username, wachtwoord } = req.body;

    // Controleer of de vereiste velden zijn opgegeven
    if (!username || !wachtwoord) {
        return res.status(400).json({ success: false, message: 'Geef een geldige gebruikersnaam en wachtwoord op' });
    }

    // Probeer de gebruiker in te loggen
    const loginResult = await loginUser(username, wachtwoord);

    // Retourneer het resultaat van de inlogpoging
    res.json(loginResult);
});

app.post('/registreer', (req, res) => {
    // Hier kun je de gebruikersgegevens uit het verzoek halen en toevoegen aan de database
    const { gebruikersnaam, wachtwoord } = req.body;
    
    // Voeg de gebruiker toe aan de database (vervang dit door de werkelijke logica)
    // Voorbeeld: database.insertUser(gebruikersnaam, wachtwoord);
    
	
    // Stuur een antwoord terug naar de client
    // Geef een succesbericht en stuur de gebruiker door naar de loginpagina
    res.status(200).json({ message: 'Registratie succesvol! Redirect naar de login pagina...' });
});

app.get('/api/queue', (res,req) => {
	if (loggedInUsers.indexOf(req.user)>-1) {
		console.log("User " + req.user + " ingelogd");
		
		
	}
});

app.listen(PORT, async () => {
    console.log(`Server draait op http://localhost:${PORT}`);
    const connection = await initOracleConnection();
    // Hier kun je verdere initialisatie plaatsen
});


let gameState = {
    players: {
        // Speler-ID's als keys
    },
    ball: {
        x: 0,
        y: 0,
        velocityX: 0,
        velocityY: 0
    },
    scores: {
        player1: 0,
        player2: 0
    },
    timeRemaining: 900 // Bijvoorbeeld voor een 15 minuten spel
};

function createGameId(player1, player2) {
    return `game_${player1.id}_${player2.id}`;
}

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
        const data = JSON.parse(message);

        if (data.type === 'login') {
            ws.playerId = data.playerId; // Ken unieke ID toe aan de WebSocket
            playersWaiting.push(ws);

            if (playersWaiting.length >= 2) {
                // Start een nieuwe game als er tenminste twee spelers zijn
                const player1 = playersWaiting.shift();
                const player2 = playersWaiting.shift();
                const gameId = createGameId(player1, player2);

                activeGames[gameId] = {
                    player1: player1,
                    player2: player2,
                    gameState: {
                        scores: { player1: 0, player2: 0 },
                        ball: { x: 0, y: 0, velocityX: 5, velocityY: 5 }
                    }
                };

                // Informeer spelers dat het spel begint
                [player1, player2].forEach(client => {
                    client.send(JSON.stringify({ type: 'gameStart', gameId }));
                });
            }
        }
		
		if (data.type === 'updatePosition') {
			const game = activeGames[data.gameId];
			if (game) {
				// Update positie van de speler
				game.gameState[data.playerType].position = data.position; // playerType kan 'player1' of 'player2' zijn

				// Stuur de bijgewerkte positie naar de andere speler
				const otherPlayer = game[data.playerType === 'player1' ? 'player2' : 'player1'];
				if (otherPlayer) {
					otherPlayer.send(JSON.stringify({
						type: 'updatePosition',
						playerType: data.playerType,
						position: data.position
					}));
				}
			}
		}
		
		if (data.type === 'updateBallPosition') {
            const game = activeGames[data.gameId];
            if (game) {
				const gameState = game.gameState;
				gameState.ball.x = data.ballPosition.x;
				gameState.ball.y = data.ballPosition.y;

				// Stuur bijgewerkte gamestate naar beide spelers
				[game.player1, game.player2].forEach(client => {
					client.send(JSON.stringify({
						type: 'updateGameState',
						gameState: gameState
					}));
				});
			}
        }

        if (data.type === 'updateGameState') {
            // Code voor het bijwerken van de game (score, tijd, enz.)
			const game = activeGames[data.gameId];
            if (game) {
                const gameState = game.gameState;
                
                // Update balpositie
                if (data.ballPosition) {
                    gameState.ball.x = data.ballPosition.x;
                    gameState.ball.y = data.ballPosition.y;
                }

                // Update score
                if (data.scores) {
                    gameState.scores.player1 = data.scores.player1;
                    gameState.scores.player2 = data.scores.player2;
                }

                // Update tijd
                if (data.timeRemaining) {
                    gameState.timeRemaining = data.timeRemaining;
                }

				// Stuur bijgewerkte gamestate naar de andere speler
				const receiver = game.player1 === sender ? game.player2 : game.player1;
				if (receiver) {
					receiver.send(JSON.stringify({
						type: 'updateGameState',
						gameState: gameState
					}));
				}
            }
        }		
    });

    ws.on('close', () => {
        // Verwijder uit de wachtlijst als de verbinding sluit voordat een spel start
        playersWaiting = playersWaiting.filter(player => player !== ws);
    });
});

wsServer.listen(4243, () => {
    console.log('wsServer is running on http://localhost:4243');
});
