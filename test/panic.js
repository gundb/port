var config = {
	IP: require('ip').address(),
	port: 8080,
	servers: 1,
	browsers: 2,
	each: 12500,
	burst: 1000,
	wait: 1,
	dir: __dirname,
	route: {
		'/': __dirname + '/index.html',
		'/jquery.js': __dirname + '/jquery.js',
		'/ham.js': __dirname + '/ham.js',
		'/dup.js': __dirname + '/dup.js',
		'/get.js': __dirname + '/get.js',
	}
}

var panic = require('panic-server');

panic.server().on('request', function(req, res){
	config.route[req.url] && require('fs').createReadStream(config.route[req.url]).pipe(res);
}).listen(config.port);

var clients = panic.clients;
var manager = require('panic-manager')();

manager.start({
    clients: Array(config.servers).fill().map(function(u, i){
			return {
				type: 'node',
				port: config.port + (i + 1)
			}
    }),
    panic: 'http://' + config.IP + ':' + config.port
});

var servers = clients.filter('Node.js');
var browsers = clients.excluding(servers);

describe("Load test "+ config.browsers +" browser(s) across "+ config.servers +" server(s)!", function(){
	//this.timeout(5 * 60 * 1000);
	this.timeout(10 * 60 * 1000);

	it("Servers have joined!", function(){
		return servers.atLeast(config.servers);
	});

	it("Server has spawned!", function(){
		this.timeout(5000);
		var tests = [], i = 0;
		servers.each(function(client){
			tests.push(client.run(function(test){
				test.async();
				require(test.props.config.dir + '/com');
				setTimeout(function(){
					test.done();
				}, 1000);
			}, {i: i += 1, config: config})); 
		});
		return Promise.all(tests);
	});

	it(config.browsers +" browser(s) have joined!", function(){
		console.log("PLEASE OPEN http://"+ config.IP +":"+ config.port +" IN "+ config.browsers +" BROWSER(S)!");
		return browsers.atLeast(config.browsers);
	});

	it("Data was saved and synced across all browsers!", function(){
		var tests = [], ids = {}, i = 0;
		browsers.each(function(client, id){
			ids[id] = 1;
		});
		browsers.each(function(client, id){
			tests.push(client.run(function(test){
				localStorage.clear();
				var env = test.props;
				test.async();

				var graph = {};
				var dup = Dup();
				var peer = new WebSocket('ws://localhost:8081');
				peer.onclose = function(c){ console.log('close', c) };
				peer.onmessage = function(m){
					var msg = JSON.parse(m.data);
				  if(dup.check(msg['#'])){ return }
				  dup.track(msg['#']);
				  if(msg.put){
				    var diff = HAM.mix(msg.put, graph);
						Object.keys(diff).forEach(function(soul){
				    	verify(diff[soul], soul);
				    });
				  }
				  if(msg.get){
				    var ack = GET(msg.get, graph);
				    ack = JSON.stringify({
				      '#': dup.track(Dup.random()),
				      '@': msg['#'],
				      put: ack
				    });
				    peer.send(ack);
				  }
					peer.send(m.data);
				};
				peer.onerror = function(e){ console.log('error', e) };
				peer.onopen = function(o){ 
					console.log('open', o);
					SPAM();
				}
				
				var num = 0;
				var total = 0;
				var check = {};
				Object.keys(env.ids).forEach(function(id){
					var v = env.ids[id];
					var i = env.config.each;
					while(i--){
						check[id + (i + 1)] = 1;
						total += 1;
					}
				});

				var report = $("<h1>").css({position: 'fixed', top: 0, right: 0, background: 'white', padding: 10}).text(num +" / "+ total +" Verified").prependTo('body');
				var wait;

				function verify(node, soul){
					//$(log).text(key +": "+ data);
					var key = 'key', data = node[key];
					if(("Hello world, "+soul+"!") === data){
						if(check[soul]){ num += 1 }
						report.text(num +" / "+ total +" Verified");
						check[soul] = 0;
					}
					if(wait){ return }
					wait = setTimeout(function(){
						wait = false;
						if(Object.keys(check).some(function(i){
							if(check[i]){ return true }
						})){ return }
						console.log("SUCCESS");
						test.done();
					},10);
				};

				function SPAM(){
					console.log("<<<<< START >>>>>");
					var i = 0, burst = false, to = setInterval(function go(state){
						if(!burst){
							burst = env.config.burst;
							while(--burst){
								go((+new Date));
							}
							burst = false;
							return;
						}
						if(env.config.each <= i){
							clearTimeout(to);
							return;
						}
						state = state || (+new Date);
						i += 1;
						var ID = env.id + i;
						var graph = {};
						graph[ID] = {_: {'#': ID, '>': {key: state}}};
						graph[ID].key = "Hello world, "+ ID +"!";
						var msg = {
				      '#': Dup.random(),
				      put: graph
				    }
				    peer.send(JSON.stringify(msg)); 
					}, env.config.wait);
				};
			}, {i: i += 1, id: id, ids: ids, config: config})); 
		});
		return Promise.all(tests);
	});

	it("All finished!", function(done){
		console.log("Done! Cleaning things up...");
		setTimeout(function(){
			done();
		},5000);
	});

	after("Everything shut down.", function(){
		browsers.run(function(){
			//location.reload();
			//setTimeout(function(){
			//}, 15 * 1000);
		});
		return servers.run(function(){
			process.exit();
		});
	});
});