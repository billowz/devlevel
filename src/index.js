const toStr = Object.prototype.toString
const conditions = {}
const UNDEF = 'undefined',
	NUL = 'null',
	INF = 'Infinity',
	ARR = 'Array'
const byteArray = ['Uint8Array', 'Int8Array']
const shortArray = ['Uint16Array', 'Int16Array']
const intArray = ['Uint32Array', 'Int32Array']
const floatArray = ['Float32Array', 'Float64Array']
const arrayBuffer = 'ArrayBuffer'
const typedArrays = byteArray.concat(shortArray).concat(intArray).concat(floatArray).concat(arrayBuffer)

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
	arrayLike: [
		[ARR, 'Arguments', 'NodeList'].concat(typedArrays)
	],
	byteArray: [byteArray],
	shortArray: [shortArray],
	intArray: [intArray],
	floatArray: [floatArray],
	typedArrays: [typedArrays]
})
each(typedArrays, t => addTypeCon(reFirst(t), t))
addValueCon({
	nil: [
		[UNDEF, NUL]
	],
	nul: NUL,
	def: [UNDEF, 1, 1],
	undef: [UNDEF, 0, 1],
	NaN: ['o', 1],
	infinite: [INF, 0, 1]
})
addCon({
	finite: [
		['o'], o => o === o && o !== Infinity && toStr.call(o) === '[object Number]'
	],
	eq: [
		['a', 'b'], (a, b) => a === b || (a !== a && b !== b)
	],
	notEq: [
		['a', 'b'], (a, b) => a !== b && (a === a || b === b)
	]
})

function addTypeCon(name, values, notEq, notMakeNot) {
	_addCon(arguments, addTypeCon, () => addEqCon(name, [toStr], ['o'], '$0.call(o)', map(arrayVal(values), v => `'[object ${v}]'`), notEq, notMakeNot))
}

function addValueCon(name, values, notEq, notMakeNot) {
	_addCon(arguments, addValueCon, () => addEqCon(name, undefined, ['o'], 'o', values, notEq, notMakeNot))
}

function _addCon(args, thisCb, cb) {
	args.length === 1 ? each(args[0], (v, n) => thisCb.apply(null, [n].concat(v))) : cb()
}

function addEqCon(name, injects = [], args, conCode, values, notEq, notMakeNot) {
	values = arrayVal(values)
	const params = map(injects, (v, i) => '$' + i)

	params.push(`return function(${args.join(',')}){
${values.length > 1 ? `switch(${conCode}){
case ${values.join(':\n\t\tcase ')}: return ${!notEq};
default: return ${!!notEq};
}`: `return (${conCode})${notEq ? '!': '='}==${values[0]};`}
    }`)

	addCon(name, args, Function.apply(Function, params).apply(null, injects))
	if (!notMakeNot)
		addEqCon('not' + reFirst(name, 1), injects, args, conCode, values, !notEq, 1)
}

function addCon(name, args, fn) {
	if (arguments.length === 1)
		each(name, (v, n) => {
			conditions[n] = v
		})
	else
		conditions[name] = [args, fn]
}

function _if(condition, callback, isNot) {
	const args = condition[0]
	return new Function('condition', 'callback', 'slice', `return function(${args.join(',')}){
if(${isNot ? '!' : ''}condition(${args.join(',')}))
    callback(slice(arguments, ${args.length}));
}`)(condition[1], callback, sliceArgs)
}

function assignCons(obj, callback, isNot) {
	for (let name in conditions)
		obj[name] = _if(conditions[name], callback, isNot)
	return obj
}

function callBy(condition, cb) {
	const len = arguments.length
	if (len > 1) condition && cb()
	else if (len) condition()
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
export {
	logMap as log
}

function createLog(name, level) {
	function log() {
		level >= currentLevel && log.print.apply(this, arguments)
	}
	log.level = level
	log.methods = getLogMethods(name, log)
	logs[level] = log
	logMap[name] = log
	return bindLog(log)
}

function getLogMethods(name, log) {
	const mark = `[${name}]: `
	return assignCons({
		by: callBy,
		when(condition) {
			condition && log.print.apply(log, sliceArgs(arguments, 1))
		},
		print(msg) {
			if (arguments.length) {
				const args = map(arguments, v => v)
				if (typeof msg === 'string') {
					args[0] = mark + args[0]
				} else {
					args.unshift(mark)
				}
				log.__print(args, name)
			}
		}
	}, args => log.print.apply(log, args))
}

function empty() {}

function bindLog(log) {
	const {
		level,
		methods
	} = log
	for (let method in methods)
		log[method] = level < currentLevel ? empty : methods[method]
	return log
}

export function setLogLevel(level) {
	const log = logMap[level]
	assert(log, 'invalid log level: ' + level)
	level = log.level
	if (level !== currentLevel) {
		currentLevel = level
		each(logs, bindLog)
	}

}

export function setLogConsole(console, applyArgs) {
	each(logs, log => {
		log.__print = applyArgs ? (args, name) => {
			console[name].apply(console, args)
		} : (args, name) => console[name](args, name)
	})
}
export function isLog(level) {
	const log = logMap[level]
	assert(log, 'invalid log level: ' + level)
	return log.level >= currentLevel
}

if (!console) console = { log() {} }
if (!console.info) console.info = console.log
setLogConsole(console, 1)

export function sliceArgs(args, offset) {
	let len = args.length
	const arr = new Array(len - offset)
	while (len-- > offset)
		arr[len - offset] = args[len]
	return arr
}

export function each(obj, cb) {
	if (obj instanceof Array) {
		var i = obj.length
		while (i--) cb(obj[i], i)
	} else {
		for (let key in obj)
			cb(obj[key], key)
	}
}

export function map(arr, cb) {
	let i = arr.length,
		ret = new Array(i)
	while (i--)
		ret[i] = cb(arr[i], i)
	return ret
}

export function reFirst(str, upper) {
	return str.replace(/^[a-zA-Z]/, upper ? o => o.toUpperCase() : o => o.toLowerCase())
}

export function arrayVal(val) {
	return val instanceof Array ? val : [val]
}