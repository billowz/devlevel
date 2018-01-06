import { assert, log, isLog, setLogConsole, setLogLevel, each, map, reFirst } from './index'

let msgId = 1

function randomMsg() {
	return `random msg [${msgId}]`
}

const byteArray = [new Uint8Array(), new Int8Array()]
const shortArray = [new Uint16Array(), new Int16Array()]
const intArray = [new Uint32Array(), new Int32Array()]
const floatArray = [new Float32Array(), new Float64Array()]
const arrayBuffer = new ArrayBuffer()
const typedArrays = byteArray.concat(shortArray).concat(intArray).concat(floatArray).concat(arrayBuffer)
const undef = [undefined]
undef.noNot = true
const caseValues = {
	bool: [true, false],
	num: [0, NaN, Infinity],
	str: ['', '0', new String()],
	fn: [fn],
	date: [new Date()],
	array: [
		[]
	],
	byteArray,
	shortArray,
	intArray,
	floatArray,
	arrayBuffer: [arrayBuffer],
	err: [new Error()],
	reg: [new RegExp('^a'), /b$/],
	obj: [{}, new Object(), new fn()],
	nul: [null],
	undef
}

function getValuesExclude(method) {
	let values = []
	each(caseValues, (v, key) => {
		if (key !== method)
			values = values.concat(v)
	})
	return values
}

function fn() {}
describe("assert", () => {

	const msg = 'test error msg'
	it("assert", () => {
		expect(() => assert(1)).not.toThrow()
		expect(() => assert(0)).toThrow()
		expect(() => assert(false, msg)).toThrow(msg)
		expect(() => assert(false, new TypeError(msg))).toThrow(msg)
		expect(() => assert(false, new TypeError(msg))).toThrow(TypeError)
		expect(() => assert(false, () => msg)).toThrow(msg)
		expect(() => assert(false, () => new TypeError(msg))).toThrow(msg)
		expect(() => assert(false, () => new TypeError(msg))).toThrow(TypeError)
		expect(() => assert(false, () => {
			throw new TypeError(msg)
		})).toThrow(msg)
		expect(() => assert(false, () => {
			throw new TypeError(msg)
		})).toThrow(TypeError)
	})

	it('assert.by', () => {
		callNum(0, fn => assert.by(0, fn))
		callNum(1, fn => assert.by(1, fn))

		callNum(1, fn => assert.by(fn))
	})

	it(`assert.eq`, () => {
		expect(() => assert.eq(NaN, NaN, msg)).not.toThrow()
		expect(() => assert.eq(+0, -0, msg)).not.toThrow()
		expect(() => assert.eq('', '', msg)).not.toThrow()

		expect(() => assert.eq({}, {}, msg)).toThrow(msg)
		expect(() => assert.eq([], [], msg)).toThrow(msg)
	})
	it(`assert.notEq`, () => {
		expect(() => assert.notEq({}, {}, msg)).not.toThrow()
		expect(() => assert.notEq([], [], msg)).not.toThrow()

		expect(() => assert.notEq(NaN, NaN, msg)).toThrow(msg)
		expect(() => assert.notEq(+0, -0, msg)).toThrow(msg)
		expect(() => assert.notEq('', '', msg)).toThrow(msg)
	})

	assertCase('arrayLike', [
		[], arguments, new Array()
	].concat(typedArrays), [{ length: 1 }])

	assertCase('nil', [undefined, null], [0, '', false])
	assertCase('def', [1, null, NaN, {}], [undefined], true)
	assertCase('NaN', [NaN, +'a'], [undefined, 1 / 0, ''])
	assertCase('infinite', [1 / 0], [NaN, 0, 'a'], true)
	assertCase('finite', [0, 1], [NaN, Infinity], true)

	each(caseValues, (values, method) => {
		const otherValues = getValuesExclude(method)
		assertCase(method, values, otherValues, values.noNot)
	})


	function assertCase(method, validValues, invalidValues, noNot) {
		it(`assert.${method}`, () => {
			each(validValues, value => {
				const msg = randomMsg()
				expect(() => assert[method](value, msg)).not.toThrow()
			})
			each(invalidValues, value => {
				const msg = randomMsg()
				expect(() => assert[method](value, msg)).toThrow(msg)
			})
		})
		if (!noNot)
			assertCase('not' + reFirst(method, true), invalidValues, validValues, true)
	}
})




let logs

function resetLogs() {
	logs = { debug: [], info: [], warn: [], error: [] }
}
resetLogs()

setLogConsole({
	debug(args) {
		logs.debug.unshift(args.join(''))
	},
	info(args) {
		logs.info.unshift(args.join(''))
	},
	warn(args) {
		logs.warn.unshift(args.join(''))
	},
	error(args) {
		logs.error.unshift(args.join(''))
	}
})

describe('log', () => {
	it('loglevel', () => {
		setLogLevel('debug')
		expect(isLog('debug')).toBe(true)
		expect(isLog('info')).toBe(true)
		expect(isLog('warn')).toBe(true)
		expect(isLog('error')).toBe(true)

		setLogLevel('info')
		expect(isLog('debug')).toBe(false)
		expect(isLog('info')).toBe(true)
		expect(isLog('warn')).toBe(true)
		expect(isLog('error')).toBe(true)


		setLogLevel('warn')
		expect(isLog('debug')).toBe(false)
		expect(isLog('info')).toBe(false)
		expect(isLog('warn')).toBe(true)
		expect(isLog('error')).toBe(true)

		setLogLevel('error')
		expect(isLog('debug')).toBe(false)
		expect(isLog('info')).toBe(false)
		expect(isLog('warn')).toBe(false)
		expect(isLog('error')).toBe(true)
	})
})
logTestCase('debug', ['debug', 'info', 'warn', 'error'])
logTestCase('info', ['debug', 'info', 'warn', 'error'])
logTestCase('warn', ['debug', 'info', 'warn', 'error'])
logTestCase('error', ['debug', 'info', 'warn', 'error'])


function logTestCase(name, levels) {
	describe(name, () => {
		each(levels, level => {
			const l = log[name]

			logCase(name, level, () => {
				const msg = randomMsg()
				if (isLog(name)) {
					logMsg(name, msg, () => l(msg))
					logMsg(name, '12', () => l(1, 2))
				} else {
					logNum(name, 0, () => l(msg))
				}
			})

			logCase(`${name}.print`, level, () => {
				const msg = randomMsg()
				if (isLog(name)) {
					logMsg(name, msg, () => l.print(msg))
					logMsg(name, '12', () => l.print(1, 2))
				} else {
					logNum(name, 0, () => l.print(msg))
				}
			})
			logCase(`${name}.by`, level, () => {
				callNum(isLog(name) ? 1 : 0, fn => l.by(1, fn))
				callNum(0, fn => l.by(0, fn))
				callNum(isLog(name) ? 1 : 0, fn => l.by(fn))
			})

			logCase(`${name}.when`, level, () => {
				const msg = randomMsg()
				if (isLog(name)) {
					logMsg(name, msg, () => l.when(1, msg))
					logMsg(name, '12', () => l.when(1, 1, 2))
				} else {
					logNum(name, 0, () => l.when(1, msg))
				}
				logNum(name, 0, () => l.when(0, msg))
			})

			logCase(`${name}.eq`, level, () => {
				const msg = randomMsg()
				if (isLog(name)) {
					logMsg(name, msg, () => l.eq(NaN, NaN, msg))
					logMsg(name, '12', () => l.eq(0, 0, 1, 2))
				} else {
					logNum(name, 0, () => l.eq(1, 1, msg))
				}
				logNum(name, 0, () => l.eq(0, '', msg))
			})

			logCase(`${name}.notEq`, level, () => {
				const msg = randomMsg()
				if (isLog(name)) {
					logMsg(name, msg, () => l.notEq(undefined, null, msg))
					logMsg(name, '12', () => l.notEq(undefined, 0, 1, 2))
				} else {
					logNum(name, 0, () => l.notEq(1, 1, msg))
				}
				logNum(name, 0, () => l.notEq(NaN, NaN, msg))
			})
			logFnCases('debug', [level])
		})
	})
}

function logFnCases(name, levels) {
	each(levels, level => {
		each(caseValues, (values, method) => {
			const otherValues = getValuesExclude(method)
			logFnCase(name, method, level, values, otherValues, values.noNot)
		})
		logFnCase(name, 'arrayLike', level, [
			[], arguments, new Array()
		].concat(typedArrays), [{ length: 1 }])

		logFnCase(name, 'nil', level, [undefined, null], [0, '', false])
		logFnCase(name, 'def', level, [1, null, NaN, {}], [undefined], true)
		logFnCase(name, 'NaN', level, [NaN, +'a'], [undefined, 1 / 0, ''])
		logFnCase(name, 'infinite', level, [1 / 0], [NaN, 0, 'a'], true)
		logFnCase(name, 'finite', level, [0, 1], [NaN, Infinity], true)
	})
}

function logFnCase(name, method, level, validValues, invalidValues, noNot) {
	const l = log[name]

	function test(valid, value) {
		resetLogs()
		const msg = randomMsg()
		if (valid && isLog(name)) {
			logMsg(name, msg, () => l[method](value, msg))
			logMsg(name, '12', () => l.when(1, 1, 2))
		} else {
			logNum(name, 0, () => l[method](value, msg))
		}
	}

	logCase(`${name}.${method}`, level, () => {
		each(validValues, value => test(true, value))
		each(invalidValues, value => test(false, value))
	})
	if (!noNot)
		logFnCase(name, 'not' + reFirst(method, true), level, invalidValues, validValues, true)
}

function logCase(name, level, cb) {
	it(`${name} (${level} level)`, () => {
		logScope(level, cb)
	})
}

function logScope(level, cb) {
	setLogLevel(level)
	cb()
}

function logNum(name, num, cb) {
	resetLogs()
	cb()
	expect(logs[name].length).toBe(num)
}

function logMsg(name, msg, cb) {
	resetLogs()
	cb()
	expect(logs[name].length).toBe(1)
	expect(logs[name][0]).toBe(`[${name}]: ` + msg)
}

function callNum(num, cb) {
	const fn = jest.fn()
	cb(fn)
	expect(fn.mock.calls.length).toBe(num)
}
