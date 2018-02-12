var Dup = require('../dup'), dup = Dup();

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(peer){
  peer.on('message', function incoming(data){
    var msg = JSON.parse(data);
    if(dup.check(msg['#'])){ return } // COMMENT OUT THIS LINE TO TEST!!!
    dup.track(msg['#']);
    console.log('received:', msg);
  });
  var count = 0;
  setInterval(function(){
    count += 1;
  	var msg = {
  		'#': dup.track(count)
		}
    peer.send(JSON.stringify(msg));
  }, 1000);
});

/* // BROWSER!
var peer = new WebSocket('ws://localhost:8080');
peer.onopen = function(o){ console.log('open', o) };
peer.onclose = function(c){ console.log('close', c) };
peer.onmessage = function(m){
	var msg = JSON.parse(m.data);
	console.log(msg);
	peer.send(m.data);
};
peer.onerror = function(e){ console.log('error', e) };
*/