var store = require('./store');

var GET = require('../GET');

var HAM = require('../ham');

var peers = [], graph = {};

var Dup = require('../dup'), dup = Dup();

var WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ port: 8080 });

wss.on('connection', function connection(peer){
  peers.push(peer);
  peer.on('message', function incoming(data){
    var msg = JSON.parse(data);
    if(dup.check(msg['#'])){ return }
    dup.track(msg['#']);
    if(msg.put){
      var change = HAM.mix(msg.put, graph);
      //console.log("CHANGE!", change);
      store.put(change, function(err, ok){
        emit(JSON.stringify({
          '#': dup.track(Dup.random()),
          '@': msg['#'],
          err: err,
          ok: ok
        }));
      });
    }
    if(msg.get){
      var ack = GET(msg.get, graph);
      if(ack){
        emit(JSON.stringify({
          '#': dup.track(Dup.random()),
          '@': msg['#'],
          put: ack
        }));
      } else {
        store.get(msg.get, function(err, ack){
          emit(JSON.stringify({
            '#': dup.track(Dup.random()),
            '@': msg['#'],
            put: ack,
            err: err,
          }));
        });
      }
    }
    emit(data);
  });
});

function emit(data){
  peers.forEach(function(peer){
    try{peer.send(data)}catch(e){}
  });
}

// BROWSER! Use index.html