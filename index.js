const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const port = 3000;
const path = require('path');

const users = [];

let designatedUser = null;

app.use(express.static(path.join(__dirname, 'public')));

const setDesignatedUser = (user) => {
  if (!user && designatedUser) {
    return;
  }

  if (user) {
    designatedUser = user;
  }else{
    designatedUser = users.filter(u => !!u.name)[0];
  }

  if (designatedUser) {
    console.log('designated', designatedUser.name);
    io.emit('designated', designatedUser.name);
  }

  users.forEach(function (user) {
    user.designated = (designatedUser === user);
  });
};

const win = (userName) => {
  io.emit('chat', { text: userName + ' a castigat!' });

  const user = users.filter(user => userName === user.name)[0];
  setDesignatedUser(user);
};

io.on('connection', function (socket) {

  const user = {
    socket
  };

  users.push(user);
  console.log('User connected!');

  socket.on('disconnect', function () {
    for (let i = 0; i < users.length; i++) {
      if (users[i] === user) {
        users.splice(i, 1);
        break;
      }
    }

    if (user.name) {
      socket.broadcast.emit('left', user.name);
      console.log(user.name, 'disconnected!');
    } else {
      console.log('User disconnected!');
    }

    if (user.designated) {
      designatedUser = undefined;
      setDesignatedUser();
    }
  });

  socket.on('drawing', function (data) {

    if (user.designated) {
      socket.broadcast.emit('drawing', data);
    }
  });

  socket.on('name', function (name) {
    user.name = name;
    console.log(name, 'joined');
    socket.broadcast.emit('join', name);
    setDesignatedUser();
  });

  socket.on('chat', function (text) {
    socket.broadcast.emit('chat', { sender: user.name, text });
  });

  socket.on('win', function (username) {
    if (!user.designated) {
      return;
    }

    win(username);
  })
});

http.listen(port, function () {
  console.log('listening on port ' + port)
});
