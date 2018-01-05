import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import uglify from 'rollup-plugin-uglify'
import gzip from 'rollup-plugin-gzip'
import filesize from 'rollup-plugin-filesize'
import pkg from './package.json';

const {
	name,
	homepage,
	author,
	license,
	version,
	description
} = pkg
const namespace = name
const module = name
const dest = pkg.main
const main = pkg['jsnext:main']

export default [
	cfg({
		input: main,
		output: dest,
		namespace,
		module
	}),
	cfg({
		input: main,
		output: dest.replace(/\.js$/, '.min.js'),
		namespace,
		module,
		plugins: [uglify(), gzip()]
	})
];


function cfg({
	input,
	output,
	namespace,
	module,
	plugins = []
}) {
	return {
		input,
		name: namespace, // global name
		output: {
			file: output,
			sourcemap: true,
			format: 'umd',
			amd: {
				id: module || name // amd name
			}
		},
		strict: false,
		legacy: true, // run in ie8
		plugins: [
			filesize(), resolve(), babel({
				exclude: 'node_modules/**'
			})
		].concat(plugins)
	}
}