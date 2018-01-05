import { assert, debug, info, warn, error } from './index'
const msg = 'test error msg'

function fn() {}
describe("assert", () => {

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

	function assertCase(method, validValues, invalidValues, noNot) {
		it(`assert.${method}`, () => {
			each(validValues, value => {
				expect(() => assert[method](value, msg)).not.toThrow()
			})
			each(invalidValues, value => {
				expect(() => assert[method](value, msg)).toThrow(msg)
			})
		})

		if (!noNot) {
			const method2 = 'not' + method.replace(/^[a-zA-Z]/, v => v.toUpperCase())
			it(`assert.${method2}`, () => {
				each(invalidValues, value => {
					expect(() => assert[method2](value, msg)).not.toThrow()
				})
				each(validValues, value => {
					expect(() => assert[method2](value, msg)).toThrow(msg)
				})
			})
		}
	}

	function getValuesExclude(method) {
		let values = []
		each(caseValues, (v, key) => {
			if (key !== method)
				values = values.concat(v)
		})
		return values
	}

	each(caseValues, (values, method) => {
		const otherValues = getValuesExclude(method)
		assertCase(method, values, otherValues, values.noNot)
	})

	assertCase('arrayLike', [
		[], arguments, new Array()
	].concat(typedArrays), [{ length: 1 }])

	assertCase('nil', [undefined, null], [0, '', false])
	assertCase('def', [1, null, NaN, {}], [undefined], true)
	assertCase('NaN', [NaN, +'a'], [undefined, 1 / 0, ''])
	assertCase('infinite', [1 / 0], [NaN, 0, 'a'], true)
	assertCase('finite', [0, 1], [NaN, Infinity], true)

	it(`assert.eq`, () => {
		expect(() => assert.eq(NaN, NaN, msg)).not.toThrow()
		expect(() => assert.eq(+0, -0, msg)).not.toThrow()
		expect(() => assert.eq(new String(), '', msg)).not.toThrow()

		expect(() => assert.eq({}, {}, msg)).toThrow(msg)
		expect(() => assert.eq([], [], msg)).toThrow(msg)
	})
})

function each(obj, cb) {
	if (obj instanceof Array) {
		for (let i = 0, l = obj.length; i < l; i++)
			cb(obj[i], i)
	}
	else {
		for (let key in obj)
			cb(obj[key], key)
	}
}
