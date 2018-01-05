(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
	typeof define === 'function' && define.amd ? define('devlevel', ['exports'], factory) :
	(factory((global.devlevel = {})));
}(this, (function (exports) {

var toStr = Object.prototype.toString;
var conditions = {
	finite: function finite(o) {
		return o === o && o !== Infinity && toStr.call(o) === '[object Number]';
	}
};

var byteArray = ['Uint8Array', 'Int8Array'];
var shortArray = ['Uint16Array', 'Int16Array'];
var intArray = ['Uint32Array', 'Int32Array'];
var floatArray = ['Float32Array', 'Float64Array'];
var arrayBuffer = 'ArrayBuffer';
var typedArrays = byteArray.concat(shortArray).concat(intArray).concat(floatArray).concat(arrayBuffer);

con(isStr, 'bool', 'Boolean');
con(isStr, 'num', 'Number');
con(isStr, 'str', 'String');
con(isType, 'fn', 'function');
con(isStr, 'date', 'Date');
con(isStr, 'array', 'Array');
for (var i = 0; i < typedArrays.length; i++) {
	con(isStr, typedArrays[i].replace(/^[a-zA-Z]/, function (o) {
		return o.toLowerCase();
	}), typedArrays[i]);
}con(isStr, 'byteArray', byteArray);
con(isStr, 'shortArray', shortArray);
con(isStr, 'intArray', intArray);
con(isStr, 'floatArray', floatArray);
con(isStr, 'arrayBuffer', arrayBuffer);
con(isStr, 'typedArray', typedArrays);
con(isStr, 'array', 'Array');
con(isStr, 'array', 'Array');
con(isStr, 'reg', 'RegExp');
con(isStr, 'obj', 'Object');
con(isStr, 'err', 'Error');
con(isStr, 'arrayLike', ['Array', 'Arguments', 'NodeList'].concat(typedArrays));
con(isValue, 'nil', ['undefined', 'null']);
con(isValue, 'nul', 'null');
con(isValue, 'undef', 'undefined', 0, 0);
con(isValue, 'def', 'undefined', 1, 0);
con(isValue, 'NaN', 'o', 1);
con(isValue, 'infinite', 'Infinity');
con(function (v, isNot) {
	return isExpr(['a', 'b'], 'return ' + (isNot ? '!' : '') + '(a===b||(a!==a&&b!==b));');
}, 'eq');

function con(is, name, value) {
	var isNot = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : 0;
	var addNot = arguments.length > 4 && arguments[4] !== undefined ? arguments[4] : 1;

	var fn = conditions[name] = is(value, isNot);
	fn.__name__ = name;
	if (addNot) {
		name = 'not' + name.replace(/^[a-zA-Z]/, function (o) {
			return o.toUpperCase();
		});
		fn = conditions[name] = is(value, !isNot);
		fn.__name__ = name;
	}
}

function isType(t, isNot) {
	return isIn('o', 'typeof o', t, isNot, function (t) {
		return '\'' + t + '\'';
	});
}

function isStr(s, isNot) {
	return isIn('o', 'Object.prototype.toString.call(o)', s, isNot, function (s) {
		return '\'[object ' + s + ']\'';
	});
}

function isValue(v, isNot) {
	return isIn('o', 'o', v, isNot);
}

function isIn(params, condition, cases, isNot, valueHandle) {
	if (!(cases instanceof Array)) cases = [cases];
	var len = cases.length;
	if (valueHandle) {
		var i = len,
		    arr = new Array(len);
		while (i--) {
			arr[i] = valueHandle(cases[i]);
		}cases = arr;
	}
	return isExpr(params, len > 1 ? 'switch(' + condition + '){\ncase ' + cases.join(':\n\t\tcase ') + ':\nreturn ' + !isNot + ';\ndefault:\nreturn ' + !!isNot + ';\n}' : 'return (' + condition + ')' + (isNot ? '!' : '=') + '==' + cases[0] + ';');
}

function isExpr(params, expr) {
	if (!(params instanceof Array)) params = [params];
	var fn = Function.apply(Function, params.concat(expr.apply ? expr(params) : expr));
	fn.params = params;
	return fn;
}

function _if(condition, callback, isNot) {
	var params = condition.params || ['o'];
	return new Function('condition', 'callback', 'slice', 'return function(' + params.join(',') + '){\nif(' + (isNot ? '!' : '') + 'condition(' + params.join(',') + '))\n    callback(slice(arguments, ' + params.length + '));\n}')(condition, callback, sliceArgs);
}

function assignCons(obj, callback, isNot) {
	for (var name in conditions) {
		obj[name] = _if(conditions[name], callback, isNot);
	}
}

function callBy(condition, cb) {
	switch (arguments.length) {
		case 0:
			return;
		case 1:
			condition();
			return;
		default:
			condition && cb();
	}
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

if (!console) console = {
	log: function log() {}
};

function createLog(name, level) {
	if (!console[name]) console[name] = console.log;

	function print(args) {
		args.length && console[name].apply(console, [mark].concat(args));
	}

	function log() {
		print(arguments);
	}
	log.level = level;
	log.methods = getLogMethods(name, print);
	logs[name] = log;
	logMap[level] = log;
	return bindLog(log);
}

function getLogMethods(name, print) {
	return assignCons({
		by: callBy,
		when: function when(condition) {
			condition && this.print(sliceArgs(arguments, 1));
		},

		print: print
	}, print);
}

function bindLog(log) {
	var level = log.level,
	    methods = log.methods;

	for (var method in methods) {
		log[method] = level < currentLevel ? empty : methods[method];
	}
	return log;
}

function setLogLevel(level) {
	var log = logMap[level];
	if (log) {
		var _level = log.level;
		var min = Math.min(_level, currentLevel);
		var max = Math.min(_level, currentLevel);
		for (var _i = min; _i <= max; _i++) {
			bindLog(logs[_i]);
		}
		currentLevel = _level;
	}
}

function sliceArgs(args, offset) {
	var len = args.length;
	var arr = new Array(len - offset);
	while (len-- > offset) {
		arr[len - offset] = args[len];
	}return arr;
}

exports.exception = exception;
exports.assert = assert;
exports.debug = debug;
exports.info = info;
exports.warn = warn;
exports.error = error;
exports.setLogLevel = setLogLevel;

})));
//# sourceMappingURL=devlevel.js.map
