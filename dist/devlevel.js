(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('devlevel', ['exports'], factory) :
	(factory((global.devlevel = {})));
}(this, (function (exports) { 'use strict';

	var toStr = Object.prototype.toString;
	var conditions = {};
	var UNDEF = 'undefined',
	    NUL = 'null',
	    INF = 'Infinity',
	    ARR = 'Array';
	var byteArray = ['Uint8Array', 'Int8Array'];
	var shortArray = ['Uint16Array', 'Int16Array'];
	var intArray = ['Uint32Array', 'Int32Array'];
	var floatArray = ['Float32Array', 'Float64Array'];
	var arrayBuffer = 'ArrayBuffer';
	var typedArrays = byteArray.concat(shortArray).concat(intArray).concat(floatArray).concat(arrayBuffer);

	addTypeCon({
		bool: 'Boolean',
		num: 'Number',
		str: 'String',
		fn: 'Function',
		date: 'Date',
		reg: 'RegExp',
		obj: 'Object',
		err: 'Error',
		array: ARR,
		arrayLike: [[ARR, 'Arguments', 'NodeList'].concat(typedArrays)],
		byteArray: [byteArray],
		shortArray: [shortArray],
		intArray: [intArray],
		floatArray: [floatArray],
		typedArrays: [typedArrays]
	});
	each(typedArrays, function (t) {
		return addTypeCon(reFirst(t), t);
	});
	addValueCon({
		nil: [[UNDEF, NUL]],
		nul: NUL,
		def: [UNDEF, 1, 1],
		undef: [UNDEF, 0, 1],
		NaN: ['o', 1],
		infinite: [INF, 0, 1]
	});
	addCon({
		finite: [['o'], function (o) {
			return o === o && o !== Infinity && toStr.call(o) === '[object Number]';
		}],
		eq: [['a', 'b'], function (a, b) {
			return a === b || a !== a && b !== b;
		}],
		notEq: [['a', 'b'], function (a, b) {
			return a !== b && (a === a || b === b);
		}]
	});

	function addTypeCon(name, values, notEq, notMakeNot) {
		_addCon(arguments, addTypeCon, function () {
			return addEqCon(name, [toStr], ['o'], '$0.call(o)', map(arrayVal(values), function (v) {
				return '\'[object ' + v + ']\'';
			}), notEq, notMakeNot);
		});
	}

	function addValueCon(name, values, notEq, notMakeNot) {
		_addCon(arguments, addValueCon, function () {
			return addEqCon(name, undefined, ['o'], 'o', values, notEq, notMakeNot);
		});
	}

	function _addCon(args, thisCb, cb) {
		args.length === 1 ? each(args[0], function (v, n) {
			return thisCb.apply(null, [n].concat(v));
		}) : cb();
	}

	function addEqCon(name) {
		var injects = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];
		var args = arguments[2];
		var conCode = arguments[3];
		var values = arguments[4];
		var notEq = arguments[5];
		var notMakeNot = arguments[6];

		values = arrayVal(values);
		var params = map(injects, function (v, i) {
			return '$' + i;
		});

		params.push('return function(' + args.join(',') + '){\n' + (values.length > 1 ? 'switch(' + conCode + '){\ncase ' + values.join(':\n\t\tcase ') + ': return ' + !notEq + ';\ndefault: return ' + !!notEq + ';\n}' : 'return (' + conCode + ')' + (notEq ? '!' : '=') + '==' + values[0] + ';') + '\n    }');

		addCon(name, args, Function.apply(Function, params).apply(null, injects));
		if (!notMakeNot) addEqCon('not' + reFirst(name, 1), injects, args, conCode, values, !notEq, 1);
	}

	function addCon(name, args, fn) {
		if (arguments.length === 1) each(name, function (v, n) {
			conditions[n] = v;
		});else conditions[name] = [args, fn];
	}

	function _if(condition, callback, isNot) {
		var args = condition[0];
		return new Function('condition', 'callback', 'slice', 'return function(' + args.join(',') + '){\nif(' + (isNot ? '!' : '') + 'condition(' + args.join(',') + '))\n    callback(slice(arguments, ' + args.length + '));\n}')(condition[1], callback, sliceArgs);
	}

	function assignCons(obj, callback, isNot) {
		for (var name in conditions) {
			obj[name] = _if(conditions[name], callback, isNot);
		}return obj;
	}

	function callBy(condition, cb) {
		var len = arguments.length;
		if (len > 1) condition && cb();else if (len) condition();
	}
	function exception(error) {
		if (typeof error === 'function') error = error();
		if (error instanceof Error) throw error;
		throw new Error(error);
	}

	function assert(condition, error) {
		if (!condition) exception(error);
	}
	assignCons(assert, function (args) {
		return exception(args[0]);
	}, 1);
	assert.by = callBy;

	var currentLevel = 1;
	var logs = [];
	var logMap = {};

	var debug = createLog('debug', 0);
	var info = createLog('info', 1);
	var warn = createLog('warn', 2);
	var error = createLog('error', 3);

	function createLog(name, level) {
		function log() {
			level >= currentLevel && log.print.apply(this, arguments);
		}
		log.level = level;
		log.methods = getLogMethods(name, log);
		logs[level] = log;
		logMap[name] = log;
		return bindLog(log);
	}

	function getLogMethods(name, log) {
		var mark = '[' + name + ']: ';
		return assignCons({
			by: callBy,
			when: function when(condition) {
				condition && log.print.apply(log, sliceArgs(arguments, 1));
			},
			print: function print(msg) {
				if (arguments.length) {
					var args = map(arguments, function (v) {
						return v;
					});
					if (typeof msg === 'string') {
						args[0] = mark + args[0];
					} else {
						args.unshift(mark);
					}
					log.__print(args, name);
				}
			}
		}, function (args) {
			return log.print.apply(log, args);
		});
	}

	function empty() {}

	function bindLog(log) {
		var level = log.level,
		    methods = log.methods;

		for (var method in methods) {
			log[method] = level < currentLevel ? empty : methods[method];
		}return log;
	}

	function setLogLevel(level) {
		var log = logMap[level];
		assert(log, 'invalid log level: ' + level);
		level = log.level;
		if (level !== currentLevel) {
			currentLevel = level;
			each(logs, bindLog);
		}
	}

	function setLogConsole(console, applyArgs) {
		each(logs, function (log) {
			log.__print = applyArgs ? function (args, name) {
				console[name].apply(console, args);
			} : function (args, name) {
				return console[name](args, name);
			};
		});
	}
	function isLog(level) {
		var log = logMap[level];
		assert(log, 'invalid log level: ' + level);
		return log.level >= currentLevel;
	}

	if (!console) console = {
		log: function log() {}
	};
	if (!console.info) console.info = console.log;
	setLogConsole(console, 1);

	function sliceArgs(args, offset) {
		var len = args.length;
		var arr = new Array(len - offset);
		while (len-- > offset) {
			arr[len - offset] = args[len];
		}return arr;
	}

	function each(obj, cb) {
		if (obj instanceof Array) {
			var i = obj.length;
			while (i--) {
				cb(obj[i], i);
			}
		} else {
			for (var key in obj) {
				cb(obj[key], key);
			}
		}
	}

	function map(arr, cb) {
		var i = arr.length,
		    ret = new Array(i);
		while (i--) {
			ret[i] = cb(arr[i], i);
		}return ret;
	}

	function reFirst(str, upper) {
		return str.replace(/^[a-zA-Z]/, upper ? function (o) {
			return o.toUpperCase();
		} : function (o) {
			return o.toLowerCase();
		});
	}

	function arrayVal(val) {
		return val instanceof Array ? val : [val];
	}

	exports.exception = exception;
	exports.assert = assert;
	exports.debug = debug;
	exports.info = info;
	exports.warn = warn;
	exports.error = error;
	exports.log = logMap;
	exports.setLogLevel = setLogLevel;
	exports.setLogConsole = setLogConsole;
	exports.isLog = isLog;
	exports.sliceArgs = sliceArgs;
	exports.each = each;
	exports.map = map;
	exports.reFirst = reFirst;
	exports.arrayVal = arrayVal;

	Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=devlevel.js.map
