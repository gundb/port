var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(peer){
  peer.on('message', function incoming(data){
    console.log('received:', data);
  });
  var count = 0;
  setInterval(function(){
    count += 1;
    peer.send('hello world ' + count);
  }, 1000);
});

/* // BROWSER!
var peer = new WebSocket('ws://localhost:8080');
peer.onopen = function(o){ console.log('open', o) };
peer.onclose = function(c){ console.log('close', c) };
peer.onmessage = function(m){ console.log(m.data) };
peer.onerror = function(e){ console.log('error', e) };
*/