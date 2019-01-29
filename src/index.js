const path = require('path');
const express = require('express');
const _ = require('lodash');
const app = express();
const server = require('http').createServer(app);
const io = require('socket.io')(server);
const port = process.env.PORT || 8080;

app.use(express.static(path.join(__dirname, '../client/build')));

app.get('/', (req,res,next) => {
    res.sendFile(__dirname + './index.html');
});

let rooms = {};
let socketMap = {};

function generateDeck() {
    let deck = [];
    for (let i=0;i<4;i++) {
        let suit;
        if (i === 0) {
            suit = 'S';
        } else if (i === 1) {
            suit = 'C';
        } else if (i === 2) {
            suit = 'H';
        } else {
            suit = 'D';
        }
        for (let j = 1; j < 14; j++) {
            let value;
            if (j === 1) {
                value = 'A';
            } else if (j > 1 && j < 10) {
                value = j;
            } else if (j === 10) {
                value = 'T';
            } else if (j === 11) {
                value = 'J';
            } else if (j === 12) {
                value = 'Q';
            } else {
                value = 'K';
            }
            deck.push(suit + value);
        }
    }
    for (let i = 0; i < 4; i++) {
        deck.push('WZ');
        deck.push('JE');
    }
    deck = _.shuffle(deck);
    return deck;
}

function startRound(room, round) {
    if (rooms[room]) {
        rooms[room].round = round;
        rooms[room].betting = round % rooms[room].players.length;
        let deck = generateDeck();
        for (let i = 0; i < rooms[room].players.length; i++) {
            rooms[room].players[i].cards = deck.splice(0, round);
        }
        rooms[room].trump = deck.splice(0, 1);
        io.to(room).emit('sendState', {admin: false, ...rooms[room]});
    }
}

io.on('connection', (socket) => {
    socketMap[socket.id] = socket;
    socket.emit('join', {socketId: socket.id});
    let room = null;
    socket.on('joinRoom', (code) => {
        if (rooms[room] && rooms[room].round) {
            socket.emit('joinFailed');
            return;
        }
        socket.join(code);
        room = code;
        let admin = false;
        if (!rooms[code]) {
            rooms[code] = {players: [{name: '1', socketId: socket.id}]};
            admin = true;
        } else {
            rooms[code].players.push({name: rooms[code].players.length + 1, socketId: socket.id});
        }
        io.to(code).emit('sendState', {room, admin: true, players: rooms[code].players});
        
    });
    socket.on('startGame', () => {
        startRound(room, 1);
    });
    socket.on('placeBet', (bet) => {
        rooms[room].players[rooms[room].betting].bet = bet;
        rooms[room].betting++;
        if (rooms[room].betting >= rooms[room].players.length) {
            rooms[room].betting = 0;
        }
        if (rooms[room].betting === rooms[room].round % rooms[room].players.length) {
            rooms[room].betting = null;
            rooms[room].playing = rooms[room].round % rooms[room].players.length;
        }
        io.to(room).emit('sendState', rooms[room]);
    });
    socket.on('playCard', (card, i, fn) => {
        rooms[room].players[rooms[room].playing].cards.splice(i, 1);
        if (!rooms[room].playStack) {
            rooms[room].playStack = [];
        }
        rooms[room].playStack.push(card);
        rooms[room].playing++;
        if (rooms[room].playing >= rooms[room].players.length) {
            rooms[room].playing = 0;
        }
        if (rooms[room].playing === rooms[room].round % rooms[room].players.length) {
            io.to(room).emit('sendState', {msg: 'Woo!', ...rooms[room]});
            setTimeout(() => {
                io.to(room).emit('sendState', {msg: null});
                // determine who took the hand
                rooms[room].playStack = [];
                if (rooms[room].players[0].cards.length === 0) {
                    rooms[room].playing = null;
                    if (rooms[room].round === 10) {
                        rooms[room] = undefined;
                        io.to(room).emit('sendState', {playStack: null, trump: null, room: null, players: null, playing: null, betting: null, round: null});
                        fn();
                        return;
                    } else {
                        startRound(room, rooms[room].round + 1);
                        fn();
                        return;
                    }
                }
                fn();
            }, 1000);
        } else {
            fn();
            io.to(room).emit('sendState', rooms[room]);
        }
    });
    socket.on('disconnect', () => {
        delete socketMap[socket.id];
    })
});
server.listen(port);