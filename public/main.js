'use strict';
var $window = $(window);
var socket = io();
var $canvas = $('.whiteboard');
var canvas = $canvas[0];
var colors = $('.color');
var context = canvas.getContext('2d');

var myName = undefined;
var designatedDrawer = undefined;

var current = {
  color: 'black'
};
var drawing = false;

$canvas.on('mousedown', onMouseDown);
$canvas.on('mouseup', onMouseUp);
$canvas.on('mouseout', onMouseUp);
$canvas.on('mousemove', onMouseMove);

colors.on('click', onColorUpdate);

socket.on('drawing', onDrawingEvent);

$window.on('resize', onResize);
onResize();

function drawLine(x0, y0, x1, y1, color, emit) {
  // if we try to emit and we are not designated
  if (myName !== designatedDrawer && emit) {
    return;
  }

  context.beginPath();
  context.moveTo(x0, y0);
  context.lineTo(x1, y1);
  context.strokeStyle = color;
  context.lineWidth = 2;
  context.stroke();
  context.closePath();

  if (!emit) {
    return;
  }
  var w = canvas.width;
  var h = canvas.height;

  socket.emit('drawing', {
    x0: x0 / w,
    y0: y0 / h,
    x1: x1 / w,
    y1: y1 / h,
    color: color
  });
}

function offsetEventLocation(e) {
  const offset = $canvas.offset();
  const x = e.clientX - offset.left;
  const y = e.clientY - offset.top;

  return { x, y };
}

function onMouseDown(e) {
  drawing = true;
  const offset = offsetEventLocation(e);
  current.x = offset.x;
  current.y = offset.y;
}

function onMouseUp(e) {
  if (!drawing) {
    return;
  }
  const offset = offsetEventLocation(e);

  drawing = false;
  drawLine(current.x, current.y, offset.x, offset.y, current.color, true);
}

function onMouseMove(e) {
  if (!drawing) {
    return;
  }
  const offset = offsetEventLocation(e);

  drawLine(current.x, current.y, offset.x, offset.y, current.color, true);
  current.x = offset.x;
  current.y = offset.y;
}

function onColorUpdate(e) {
  current.color = e.target.className.split(' ')[1];
}

function onDrawingEvent(data) {
  var w = $canvas.width();
  var h = $canvas.height();
  drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color);
}

// make the canvas fill its parent
function onResize() {
  canvas.width = $canvas.width();
  canvas.height = $canvas.height();
}

// chat

$('.chat > .name > button').on('click', function () {
  const name = $('.chat > .name > input[type=text]').val();

  if (!name) {
    return;
  }

  myName = name;

  socket.emit('name', name);

  $('.chat > .name').css('visibility', 'hidden');
  $('.chat > .room').css('visibility', 'visible');
});

const addMessageToChat = function ({ sender, text }) {
  const $messageBox = $('.messages');
  if (sender) {
    const message = $('<div class="message"> <div class="from"></div> <div class="text"></div></div>');

    $('.from', message).html(sender + ':');
    $('.text', message).html(text);

    $messageBox.append(message);
    makeDesignateButtons(message);
  } else {
    const message = $('<div class="message" style="text-align: center"><div class="text"></div></div>');

    $('.text', message).html(text);

    $messageBox.append(message);
  }

  $messageBox.animate({ scrollTop: $messageBox[0].scrollHeight }, 100);
};

$('.chat > .room > .bottom > button').on('click', function () {
  const $chatBox = $('.chat > .room > .bottom > input[type=text]');

  const text = $chatBox.val().trim();
  $chatBox.val('');

  if (!text) {
    return;
  }

  socket.emit('chat', text);
  addMessageToChat({ text, sender: myName })
});

socket.on('chat', function ({ text, sender }) {
  addMessageToChat({ text, sender });
});

const makeDesignateButtons = function (element) {

  if (myName !== designatedDrawer) {
    return;
  }

  const button = $('<button class="designate-button">√</button>');
  button.on('click', function (e) {
    const $target = $(e.target);
    const $parent = $target.parent();
    const $sender = $('.from', $parent);
    const newDesignated = $sender[0].innerHTML.trim();

    socket.emit('win', newDesignated.substr(0, newDesignated.length - 1));
  });

  if (!element) {
    element = $('.messages .message .sender').parent();
  }

  const fromElement = $('.from', element)[0];
  if (
    !fromElement ||
    (fromElement && fromElement.innerHTML.trim() === myName + ':')
  ) {
    return;
  }

  element.append(button);
};

const deleteDesignateButtons = function () {
  $('.messages .message .designate-button').remove();
};

socket.on('designated', function (name) {
  designatedDrawer = name;

  // daca eu sunt ala care deseneaza
  if (myName === designatedDrawer) {
    addMessageToChat({ text: 'Tu poti desena acum!' });

    makeDesignateButtons();
  } else {
    // nu sunt eu ala
    deleteDesignateButtons();
  }

  // stergem canvas
  context.clearRect(0, 0, $canvas.width(), $canvas.height());

});