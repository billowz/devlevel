const toStr = Object.prototype.toString
const conditions = {
	finite(o) {
		return o === o && o !== Infinity && toStr.call(o) === '[object Number]'
	}
}

const byteArray = ['Uint8Array', 'Int8Array']
const shortArray = ['Uint16Array', 'Int16Array']
const intArray = ['Uint32Array', 'Int32Array']
const floatArray = ['Float32Array', 'Float64Array']
const arrayBuffer = 'ArrayBuffer'
const typedArrays = byteArray.concat(shortArray).concat(intArray).concat(floatArray).concat(arrayBuffer)

con(isStr, 'bool', 'Boolean')
con(isStr, 'num', 'Number')
con(isStr, 'str', 'String')
con(isType, 'fn', 'function')
con(isStr, 'date', 'Date')
con(isStr, 'array', 'Array')
for (let i = 0; i < typedArrays.length; i++)
	con(isStr, typedArrays[i].replace(/^[a-zA-Z]/, o => o.toLowerCase()), typedArrays[i])
con(isStr, 'byteArray', byteArray)
con(isStr, 'shortArray', shortArray)
con(isStr, 'intArray', intArray)
con(isStr, 'floatArray', floatArray)
con(isStr, 'arrayBuffer', arrayBuffer)
con(isStr, 'typedArray', typedArrays)
con(isStr, 'array', 'Array')
con(isStr, 'array', 'Array')
con(isStr, 'reg', 'RegExp')
con(isStr, 'obj', 'Object')
con(isStr, 'err', 'Error')
con(isStr, 'arrayLike', ['Array', 'Arguments', 'NodeList'].concat(typedArrays))
con(isValue, 'nil', ['undefined', 'null'])
con(isValue, 'nul', 'null')
con(isValue, 'undef', 'undefined', 0, 0)
con(isValue, 'def', 'undefined', 1, 0)
con(isValue, 'NaN', 'o', 1)
con(isValue, 'infinite', 'Infinity', 0, 0)
con((v, isNot) => isExpr(['a', 'b'], `return ${isNot ? '!':''}(a===b||(a!==a&&b!==b));`), 'eq')

function con(is, name, value, isNot = 0, addNot = 1) {
	let fn = conditions[name] = is(value, isNot)
	fn.__name__ = name
	if (addNot) {
		name = 'not' + name.replace(/^[a-zA-Z]/, o => o.toUpperCase())
		fn = conditions[name] = is(value, !isNot)
		fn.__name__ = name
	}
}

function isType(t, isNot) {
	return isIn('o', 'typeof o', t, isNot, t => `'${t}'`)
}

function isStr(s, isNot) {
	return isIn('o', 'Object.prototype.toString.call(o)', s, isNot, s => `'[object ${s}]'`)
}

function isValue(v, isNot) {
	return isIn('o', 'o', v, isNot)
}

function isIn(params, condition, cases, isNot, valueHandle) {
	if (!(cases instanceof Array)) cases = [cases]
	const len = cases.length
	if (valueHandle) {
		var i = len,
			arr = new Array(len)
		while (i--) arr[i] = valueHandle(cases[i])
		cases = arr
	}
	return isExpr(params, len > 1 ? `switch(${condition}){
case ${cases.join(':\n\t\tcase ')}:
return ${!isNot};
default:
return ${!!isNot};
}` : `return (${condition})${isNot ? '!': '='}==${cases[0]};`)
}


function isExpr(params, expr) {
	if (!(params instanceof Array))
		params = [params]
	const fn = Function.apply(Function, params.concat(expr.apply ? expr(params) : expr))
	fn.params = params
	return fn
}

function _if(condition, callback, isNot) {
	const params = condition.params || ['o']
	return new Function('condition', 'callback', 'slice', `return function(${params.join(',')}){
if(${isNot ? '!' : ''}condition(${params.join(',')}))
    callback(slice(arguments, ${params.length}));
}`)(condition, callback, sliceArgs)
}

function assignCons(obj, callback, isNot) {
	for (let name in conditions)
		obj[name] = _if(conditions[name], callback, isNot)
}

function callBy(condition, cb) {
	switch (arguments.length) {
		case 0:
			return
		case 1:
			condition()
			return
		default:
			condition && cb()
	}
}
export function exception(error) {
	if (typeof error === 'function')
		error = error()
	if (error instanceof Error) throw error
	throw new Error(error)
}

export function assert(condition, error) {
	if (!condition) exception(error)
}
assignCons(assert, (args) => exception(args[0]), 1)
assert.by = callBy


let currentLevel = 1
const logs = []
const logMap = {}

export const debug = createLog('debug', 0)
export const info = createLog('info', 1)
export const warn = createLog('warn', 2)
export const error = createLog('error', 3)

if (!console) console = {
	log() {}
}

function createLog(name, level) {
	if (!console[name]) console[name] = console.log

	function print(args) {
		args.length && console[name].apply(console, [mark].concat(args))
	}

	function log() {
		print(arguments)
	}
	log.level = level
	log.methods = getLogMethods(name, print)
	logs[name] = log
	logMap[level] = log
	return bindLog(log)
}

function getLogMethods(name, print) {
	const mark = `[${name}]: `
	return assignCons({
		by: callBy,
		when(condition) {
			condition && this.print(sliceArgs(arguments, 1))
		},
		print
	}, print)
}

function bindLog(log) {
	const {
		level,
		methods
	} = log
	for (let method in methods) {
		log[method] = level < currentLevel ? empty : methods[method]
	}
	return log
}

export function setLogLevel(level) {
	const log = logMap[level]
	if (log) {
		const level = log.level
		const min = Math.min(level, currentLevel)
		const max = Math.min(level, currentLevel)
		for (let i = min; i <= max; i++) {
			bindLog(logs[i])
		}
		currentLevel = level
	}
}

function sliceArgs(args, offset) {
	let len = args.length
	const arr = new Array(len - offset)
	while (len-- > offset)
		arr[len - offset] = args[len]
	return arr
}