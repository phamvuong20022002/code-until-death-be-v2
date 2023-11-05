const express = require('express');
const app = express();
const http = require('http');
const {Server} = require('socket.io');
const ACTIONS = require('./src/Actions');
const path = require('path');

const PORT = process.env.REACT_APP_PORT || 5000;

const server = http.createServer(app);
const io = new Server(server);

// app.use(express.static('build'));
// app.use((req, res, next) => {
//     res.sendFile(path.join(__dirname, 'build', 'index.html'));
// });

app.get('/',(req, res) =>{
    res.write(`<h1> Socket IO Start on Port: ${PORT} <h1>`);
    res.end();
});

const userSocketMap = {};

function getAllConnectedClients(roomId){
    console.log('abc', io.sockets.adapter.rooms.get(roomId))
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map((socketId)=>{
        return{
            socketId,
            username: userSocketMap[socketId],
        };
    });
};

io.on('connection',(socket)=>{
    // console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({roomId, username})=>{
        userSocketMap[socket.id] = username;

        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({socketId}) => {
            io.to(socketId).emit(ACTIONS.JOINED,{
                clients,
                username,
                socketId: socket.id,
            })
        });
        console.log(clients);
    });

    socket.on(ACTIONS.CODE_CHANGE, ({roomId, tabId, code}) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, {tabId, code});
    });

    socket.on(ACTIONS.SYNC_CODE, ({socketId, tabId, code}) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, {tabId, code});
    });

    socket.on('disconnecting', () =>{
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED,{
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

server.listen(PORT,()=>{
    console.log(`Server is listening...`);
});
