const path = require('path');
const express = require('express');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/', (req,res,next) => {
    res.sendFile(__dirname + './index.html');
});

let games = {};

let connected = 0;
io.on('connection', (socket) => {
    connected++;
    let adminSocket = false;
    let room = '';
    socket.on('joinRoom', (joinedRoom) => {
        socket.join(joinedRoom);
        room = joinedRoom;
        if (io.sockets.adapter.rooms[joinedRoom].length === 1) {
            adminSocket = true;
        }
    });
    socket.on('startGame', (options) => {
        games[room] = generateGame(options);
        io.to(room).emit('gameStarted', games[room]);
    });
    socket.on('disconnect', () => {
        connected--;
    })
});

const Tiles = {
    Desert: 1,
    Forest: 2,
    Brick: 3,
    Sheep: 4,
    Wheat: 5,
    Ore: 6
}

function generateGame(options) {
    return {
        board: [
            {type: Tiles.Desert, top: 1, topRight: 2, bottomRight: 3, bottom: 4, bottomLeft: 5, topLeft: 6},
            {type: Tiles.Forest, number: 8, bottom: 0},
            {type: Tiles.Brick, number: 6, bottomLeft: 0},
            {type: Tiles.Sheep, number: 5, topLeft: 0},
            {type: Tiles.Wheat, number: 9, top: 0},
            {type: Tiles.Ore, number: 4, topRight: 0},
            {type: Tiles.Forest, number: 2, bottomRight: 0}
        ]
    }
}

server.listen(port);