const path = require('path');
const express = require('express');
const _ = require('lodash');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
let gameData = require('./initialGameBoard.json');
const port = process.env.PORT || 8080;
const SERVER_TICKRATE = 10;

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/', (req,res,next) => {
    res.sendFile(__dirname + './index.html');
});

const specialFunctions = {
    wheatSeed: (tile, iRow, iCol) => {
        if (tile.bottom.type !== 'soil' && tile.bottom.type !== 'dirt') {
            if (Math.random() < 0.02) {
                tile.middle = {};
            }
        }
        if (tile.bottom.type === 'dirt' && Math.random() < 0.003 || tile.bottom.type === 'soil' && Math.random() < 0.01) {
            tile.middle.progress += 10;
            if (tile.middle.progress >= 100) {
                tile.middle.type = 'wheat';
                tile.middle.solid = true;
            }
        }
    }
}

function tickTiles() {
    let delta = [];
    for (let i = 0;i < gameData.board.length;i++) {
        for (let j=0;j<gameData.board[i].length;j++) {
            let tile = gameData.board[i][j];
            let diff = false;
            if (tile.top && specialFunctions[tile.top.type]) {
                specialFunctions[tile.top.type](tile,i,j);
                diff = true;
            }
            if (tile.middle && specialFunctions[tile.middle.type]) {
                specialFunctions[tile.middle.type](tile,i,j);
                diff = true;
            }
            if (tile.bottom && specialFunctions[tile.bottom.type]) {
                specialFunctions[tile.bottom.type](tile,i,j);
                diff = true;
            }

            if (diff) {
                delta.push({tile, row: i, col: j});
            }
        }
    }
    io.emit('gameBoardUpdate', delta);
}

let entityId = 1;

function removeEntity(searchTerm) {
    io.emit('removeEntity', searchTerm);
    if (typeof(searchTerm) === 'number') {
        searchTerm = {id: searchTerm};
    }
    const playerIndex = _.findIndex(gameData.entities, searchTerm);
    gameData.entities.splice(playerIndex, 1);
}
function addEntity(obj) {
    obj.id = entityId++;
    gameData.entities.push(obj);
    io.emit('addEntity', obj);
}

setInterval(tickTiles, 1000 / SERVER_TICKRATE);

io.on('connection', (socket) => {
    socket.emit('join', {socketId: socket.id, gameData});
    addEntity({
        type: 'player',
        playerId: socket.id,
        position: {x: 0, y: 0},
        size: {x: 0.8, y: 0.8}
    });
    socket.on('entityChanged', (entity) => {
        let entityIndex = _.findIndex(gameData.entities, {id: entity.id});
        gameData.entities[entityIndex] = entity;
        socket.broadcast.emit('entityChanged', entity);
    });
    socket.on('disconnect', () => {
        removeEntity({type: 'player', playerId: socket.id});
    })
});

server.listen(port);