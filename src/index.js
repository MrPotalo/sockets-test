const path = require('path');
const express = require('express');
const _ = require('lodash');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;
const codes = ["POTO", "HODO", "HODY", "BRSL", "NIPL", "TATO", "TRDR", "LOLZ", "TURD", "POOP", "PODO", "HODI", "PODI", "TATR"]

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/', (req,res,next) => {
    res.sendFile(__dirname + './index.html');
});

let data = {};
function getClientData(room) {
    let tempData = _.clone(data[room]);
    delete tempData.host;
    tempData.answers = tempData.clientAnswers;
    delete tempData.clientAnswers;
    for (let i=0;i<tempData.players.length;i++) {
        delete tempData.players[i].socket;
    }
    return tempData;
}

io.on('connection', (socket) => {
    socket.emit('join', {socketId: socket.id});
    let room = null;
    let playerIndex = -1;
    socket.on("createGame", (cbFn) => {
        const roomCode = codes[Math.floor(Math.random() * codes.length)];
        data[roomCode] = {players: [], host: socket};
        room = roomCode;
        socket.join(room);
        cbFn(roomCode);
    })
    socket.on("startGame", (gameRules) => {
        io.to(room).emit("gameStart");
        data[room].gameRules = gameRules;
        data[room].answers = [];
        data[room].numLeftToSubmit = data[room].players.length;
    });
    socket.on("submitAnswer", (answer, cbFn) => {
        data[room].answers[playerIndex] = answer;
        cbFn(true);
        if (--data[room].numLeftToSubmit <= 0) {
            data[room].clientAnswers = [];
            for (let i=0;i<data[room].answers.length;i++) {
                data[room].clientAnswers[i] = {answer: data[room].answers[i], index: i};
            }
            data[room].clientAnswers = _.shuffle(data[room].clientAnswers);
            let tempData = getClientData(room);
            io.to(room).emit("dataChanged", tempData);
            data[room].currentGuesser = 0;
            io.to(room).emit("gameStageGuess", 0);
        }
    })
    socket.on("makeGuess", (answerIndex, guessPlayerIndex, cbFn) => {
        if (answerIndex == guessPlayerIndex) {
            data[room].players[guessPlayerIndex].isOut = true;
            io.to(room).emit("playerOut", guessPlayerIndex);
            cbFn(true);
        } else {
            cbFn(false);
        }
        data[room].host.emit("madeGuess", playerIndex, data[room].answers[answerIndex], guessPlayerIndex, (guessPlayerIndex == answerIndex));
    });
    socket.on("nextGuesser", (lastAnswerCorrect)=> {
        let nextGuesser = -1;
        let playersLeft = data[room].players.length;
        for (i=1;i<data[room].players.length;i++) {
            if (!data[room].players[(data[room].currentGuesser + i) % data[room].players.length].isOut) {
                if (nextGuesser == -1)
                    nextGuesser = (data[room].currentGuesser + i) % data[room].players.length;
            } else {
                playersLeft--;
            }
        }
        if (data[room].gameRules.extraGuesses && lastAnswerCorrect) {
            nextGuesser = data[room].currentGuesser;
        }
        else if (data[room].gameRules.guessesWhenOut) {
            nextGuesser = (data[room].currentGuesser + 1) % data[room].players.length;
        }
        if (playersLeft <= 1) {
            data[room].answers = [];
            for (let i=0;i<data[room].players.length;i++) {
                data[room].players[i].isOut = undefined;
            }
            data[room].currentGuesser = 0;
            data[room].numLeftToSubmit = data[room].players.length;
            io.to(room).emit("gameOver");
        } else {
            data[room].currentGuesser = nextGuesser;
            io.to(room).emit("gameStageGuess", data[room].currentGuesser);
        }
    });


    socket.on("requestJoin", (playerData, cbFn) => {
        const roomCode = _.toUpper(playerData.code);
        if (data[roomCode]) {
            for (let i=0;i<data[roomCode].players.length;i++) {
                if (data[roomCode].players[i].name == playerData.name) {
                    cbFn(null, {Message: "A player with that name is already in this room!"});
                    return;
                }
            }
            room = roomCode;
            playerIndex = data[roomCode].players.length;
            data[roomCode].players.push({name: playerData.name, socket});
            socket.join(roomCode);
            cbFn({index: playerIndex});
            let tempData = getClientData(room);
            io.to(roomCode).emit("dataChanged", tempData);
        } else {
            cbFn(null, {Message: "Room does not exist!"});
        }
    })
    socket.on('disconnect', () => {
        
    })
});

server.listen(port);