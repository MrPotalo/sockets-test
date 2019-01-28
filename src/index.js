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


io.on('connection', (socket) => {
    socket.emit('join', {socketId: socket.id});

    socket.on('disconnect', () => {

    })
});

server.listen(port);