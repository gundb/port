var Radix = require('./radix');
var Radisk = require('./radisk');
var fs = require('fs');

function Store(opt){
	opt = opt || {};
	opt.file = String(opt.file || 'radata');

	var store = function Store(){};
	store.put = function(file, data, cb){
		fs.writeFile(opt.file+'.tmp', data, function(err, ok){
			if(err){ return cb(err) }
			fs.rename(opt.file+'.tmp', opt.file+'/'+file, cb);
		});
	};
	store.get = function(file, cb){
		fs.readFile(opt.file+'/'+file, function(err, data){
			if(err){
				if('ENOENT' === (err.code||'').toUpperCase()){
					return cb();
				}
				console.log("ERROR:", err)
			}
			if(data){ data = data.toString() }
			cb(err, data);
		});
	};
	store.list = function(cb, match){
		fs.readdir(opt.file, function(err, dir){
			dir.forEach(cb);
			cb(); // Stream interface requires a final call to know when to be done.
		});
	};
	if(!fs.existsSync(opt.file)){ fs.mkdirSync(opt.file) }
	//store.list(function(){ return true });
	return store;
}

var rad = Radisk({store: Store()});


var API = {};

API.put = function(graph, cb){
	if(!graph){ return }
  var c = 0;
  Object.keys(graph).forEach(function(soul){
    var node = graph[soul];
    Object.keys(node).forEach(function(key){
    	if('_' == key){ return }
      c++ // oh the jokes!
      var val = node[key], state = node._['>'][key];
      rad(soul+'.'+key, JSON.stringify([val, state]), ack);
    });
  });
  function ack(err, ok){
  	c--;
  	if(ack.err){ return }
  	if(ack.err = err){
  		cb(err || 'ERROR!');
  		return;
  	}
  	if(0 < c){ return }
  	cb(ack.err, 1);
  }
}

API.get = function(lex, cb){
	if(!lex){ return }
	var soul = lex['#'];
	var key = lex['.'] || '';
	var tmp = soul+'.'+key;
	var node;
	rad(tmp, function(err, val){
		var graph;
		if(val){
			Radix.map(val, each);
			if(!node){ each(val, key) }
			graph = {};
			graph[soul] = node;
		}
		cb(err, graph);
	});
	function each(val, key){
		var data = JSON.parse(val);
		node = node || {_: {'#': soul, '>': {}}};
		node[key] = data[0];
		node._['>'][key] = data[1];
	}
}

module.exports = API;