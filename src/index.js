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
    for (let i=0;i<tempData.players.length;i++) {
        delete tempData.players[i].socket;
    }
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
    socket.on("startGame", () => {
        io.to(room).emit("gameStart");
        data[room].answers = [];
        data[room].numLeftToSubmit = data[room].players.length;
    });
    socket.on("submitAnswer", (answer) => {
        data[room].answers[playerIndex] = answer;
        if (--data[room].numLeftToSubmit <= 0) {
            let tempData = getClientData(room);
            io.to(roomCode).emit("dataChanged", tempData);
            io.to(room).emit("gameStageGuess", 0);
        }
    })


    socket.on("requestJoin", (playerData, cbFn) => {
        const roomCode = playerData.code;
        if (data[roomCode]) {
            for (let i=0;i<data[roomCode].players.length;i++) {
                if (data[roomCode].players[i].name == playerData.name) {
                    cbFn({Message: "A player with that name is already in this room!"});
                    return;
                }
            }
            room = roomCode;
            playerIndex = data[roomCode].players.length;
            data[roomCode].players.push({name: playerData.name, socket});
            socket.join(roomCode);
            cbFn();
            let tempData = getClientData(room);
            io.to(roomCode).emit("dataChanged", tempData);
        } else {
            cbFn({Message: "Room does not exist!"});
        }
    })
    socket.on('disconnect', () => {
        
    })
});

server.listen(port);