const path = require('path');
const express = require('express');
const _ = require('lodash');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;

//let gameData_old = require('./initialGameBoard.json');
let gameData = {board: [], entities: [], players: [{id: 0, type: 'pseudoplayer', position: {x: 0, y: 0}}]};
const BOARD_WIDTH = 30;
const BOARD_HEIGHT = 30;
const SERVER_TICKRATE = 10;
const PLAYER_LOAD_DISTANCE = 15;

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
    let tilesToTick = [];
    for (let i = 0; i < gameData.players.length; i++) {
        const playerLocation = {x: Math.round(gameData.players[i].position.x), y: Math.round(gameData.players[i].position.y)};
        const startPos = {x: playerLocation.x - PLAYER_LOAD_DISTANCE, y: playerLocation.x - PLAYER_LOAD_DISTANCE};
        const endPos = {x: playerLocation.x + PLAYER_LOAD_DISTANCE, y: playerLocation.y + PLAYER_LOAD_DISTANCE};
        if (startPos.x < 0) { startPos.x = 0; }
        if (startPos.y < 0) { startPos.y = 0; }

        if (endPos.x >= BOARD_WIDTH) { endPos.x = BOARD_WIDTH - 1; }
        if (endPos.y >= BOARD_HEIGHT) { endPos.y = BOARD_HEIGHT - 1; }

        for (let y = startPos.y; y < endPos.y; y++) {
            for (let x = startPos.x; x < endPos.x; x++) {
                if (!gameData.board[y][x]['__willTick']) {
                    tilesToTick.push({tile: gameData.board[y][x], x, y});
                }
            }
        }
    }

    for (let i = 0; i < tilesToTick.length; i++) {
        let tileData = tilesToTick[i];
        delete tileData.tile['__willTick'];
        let diff = false;
        if (tileData.tile.top && specialFunctions[tileData.tile.top.type]) {
            specialFunctions[tileData.tile.top.type](tileData.tile,tileData.y,tileData.x);
            diff = true;
        }
        if (tileData.tile.middle && specialFunctions[tileData.tile.middle.type]) {
            specialFunctions[tileData.tile.middle.type](tileData.tile,tileData.y,tileData.x);
            diff = true;
        }
        if (tileData.tile.bottom && specialFunctions[tileData.tile.bottom.type]) {
            specialFunctions[tileData.tile.bottom.type](tileData.tile,tileData.y,tileData.x);
            diff = true;
        }

        if (diff) {
            delta.push({tile: tileData.tile, row: tileData.y, col: tileData.x});
        }
    }
    //io.emit('gameBoardUpdate', delta);
}

let entityId = 1;

function removeEntity(searchTerm) {
    io.emit('removeEntity', searchTerm);
    if (searchTerm.type === 'player') {
        const playerIndex = _.findIndex(gameData.players, searchTerm);
        if (playerIndex > -1) {
            gameData.players.splice(playerIndex, 1);
        }
    } else {
        const entityIndex = _.findIndex(gameData.entities, searchTerm);
        if (entityIndex > -1) {
            gameData.entities.splice(entityIndex, 1);
        }
    }
}
function addEntity(obj) {
    obj.id = entityId++;
    if (obj.type === 'player') {
        gameData.players.push(obj);
    } else {
        gameData.entities.push(obj);
    }
    io.emit('addEntity', obj);
}


function subVectors(v1, v2) {
    return {x: v1.x - v2.x, y: v1.y - v2.y};
}


function sendPlayerGameData(playerSocket, searchTerm) {
    let playerGameData = {board: [], entities: [], players: []};
    let player = _.find(gameData.players, searchTerm);
    const start = {x: Math.round(player.position.x - PLAYER_LOAD_DISTANCE), y: Math.round(player.position.y - PLAYER_LOAD_DISTANCE)};
    const end = {x: Math.round(player.position.x + PLAYER_LOAD_DISTANCE), y: Math.round(player.position.y + PLAYER_LOAD_DISTANCE)};
    if (start.x < 0) { start.x = 0; }
    if (start.y < 0) { start.y = 0; }
    if (end.x >= BOARD_WIDTH) { end.x = BOARD_WIDTH - 1; }
    if (end.y >= BOARD_HEIGHT) { end.y = BOARD_HEIGHT - 1; }

    const offset = {x: player.position.x - PLAYER_LOAD_DISTANCE, y: player.position.y - PLAYER_LOAD_DISTANCE};
    for (let i = 0; i < gameData.entities.length; i++) {
        const entity = gameData.entities[i];
        if (entity.position.x > start.x && entity.position.x < end.x && entity.position.y > start.y && entity.position.y < end.y) {
            playerGameData.entities.push(entity);
        }
    }
    for (let i = 0; i < gameData.players.length; i++) {
        const player = gameData.players[i];
        if (player.position.x > start.x && player.position.x < end.x && player.position.y > start.y && player.position.y < end.y) {
            playerGameData.players.push(player);
        }
    }
    console.log('x: ' + start.x + ' to ' + end.x);
    console.log('y: ' + start.y + ' to ' + end.y);
    for (let y = start.y; y < end.y; y++) {
        let boardRow = [];
        for (let x = start.x; x < end.x; x++) {
            boardRow.push(gameData.board[y][x]);
        }
        playerGameData.board.push(boardRow);
    }
    playerGameData.offset = offset;
    playerSocket.emit('playerGameData', playerGameData);
}



// GENERATE BOARD
let boardGeneration = 0;
for (let y = 0; y < BOARD_HEIGHT; y++) {
    let boardRow = [];
    for (let x = 0; x < BOARD_WIDTH; x++) {
        boardRow.push({bottom: {type: (x + y) % 2 == 0 ? 'red' : 'grass'}});
    }
    gameData.board.push(boardRow);
    boardGeneration++;
    io.emit('boardGenerationProgress', boardGeneration);
}
boardGeneration = -1;
io.emit('boardGenerationDone');

setInterval(tickTiles, 1000 / SERVER_TICKRATE);

io.on('connection', (socket) => {
    socket.emit('join', {socketId: socket.id});
    if (boardGeneration === -1) {
        sendPlayerGameData(socket, {type: 'pseudoplayer', id: 0});
    }
    addEntity({
        type: 'player',
        playerId: socket.id,
        position: {x: Math.random() * BOARD_WIDTH / 2 + BOARD_WIDTH / 4, y: Math.random() * BOARD_HEIGHT / 2 + BOARD_HEIGHT / 4},
        size: {x: 0.8, y: 0.8}
    });
    sendPlayerGameData(socket, {type: 'player', playerId: socket.id});
    socket.on('getPlayerGameData', () => {
        sendPlayerGameData(socket, {type: 'player', playerId: socket.id});
    })
    socket.on('entityChanged', (entity) => {
        if (entity.type === 'player') {
            const playerIndex = _.findIndex(gameData.players, {id: entity.id});
            if (playerIndex > -1) {
                gameData.players[playerIndex] = entity;
            }
        } else {
            const entityIndex = _.findIndex(gameData.entities, {id: entity.id});
            if (entityIndex > -1) {
                gameData.entities[entityIndex] = entity;
            }
        }
        socket.broadcast.emit('entityChanged', entity);
    });
    socket.on('disconnect', () => {
        removeEntity({type: 'player', playerId: socket.id});
    })
});

server.listen(port);