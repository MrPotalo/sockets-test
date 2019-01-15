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

let connected = 0;
io.on('connection', (socket) => {
    connected++;
    io.emit('hey', { message: 'User connected', color: '#00ff00'})
    socket.on('hey', ({ message }) => {
        io.emit('hey', { message });
    })
    socket.on('disconnect', () => {
        connected--;
        io.emit('hey', { message: 'User disconnected', color: '#ff0000'})
    })
});

server.listen(port);