const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);
//const { v4: uuidV4 } = require('uuid')

app.set('view engine', 'ejs');
app.use(express.static('client'));

app.get('/', (req, res) => {
  res.redirect('session1')
});

app.get('/:room', (req, res) => {
  res.render('video_chat', { roomId: req.params.room })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId) => {
    socket.join(roomId);
    console.log("joined");
    console.log(roomId);
    socket.broadcast.to(roomId).emit('user-connected', userId)

    socket.on('disconnect', () => {
		socket.broadcast.to(roomId).emit('user-disconnected', userId)
    });
    socket.on('message-submitted', (message, messageUserId) => {
      console.log(message);
      console.log(messageUserId);
      io.to(roomId).emit('createMessage', message, messageUserId);
      });
  });
});

server.listen(process.env.PORT || 5000, () => {
	console.log('listening');
  });