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
      HAM.mix(msg.put, graph);
      console.log("----------------");
      console.log(graph);
    }
    peers.forEach(function(peer){
      try{peer.send(data)}catch(e){}
    });
  });
});

// BROWSER! Use index.html
