import resolve from 'rollup-plugin-node-resolve'
import babel from 'rollup-plugin-babel'
import {uglify} from 'rollup-plugin-uglify'
import filesize from 'rollup-plugin-filesize'
import visualizer from 'rollup-plugin-visualizer'
import pkg from './package.json';

function config(options) {
	return Object.assign({
		input: './src/index.js'
	}, options, {
		plugins: [
			filesize(),
			resolve({ jsnext: true }),
			babel({})
		].concat(options.plugins || [])
	})
}

function umd(options) {
	return Object.assign({
		sourcemap: true,
		name: pkg.namespace || pkg.name,
		strict: true,
		legacy: true,
		format: 'umd',
		amd: {
			id: pkg.name
		}
	}, options)
}

export default [ // production
	// modules
	config({
		external: Object.keys(pkg.dependencies||{}),
		output: [
			{ file: pkg.main, format: 'cjs', sourcemap: true },
			{ file: pkg.module, format: 'esm', sourcemap: true }
		]
	}),
	config({
		output: umd({
			file: `dist/${pkg.name}.js`
		})
	}),
	config({
		output: umd({
			file: `dist/${pkg.name}.min.js`
		}),
		plugins: [uglify({
			warnings: true,
			sourcemap: true,
			ie8: true
		}), visualizer({
			filename: 'code-analysis.html',
			sourcemap: true
		})]
	})
]
