/**
 * Gulp default configuration for chrome extension.
 * @license MIT
 * @author Evens Pierre <pierre.evens16@gmail.com>
 */
const zip = require('gulp-zip')
const sass = require('gulp-sass')
const cache = require('gulp-cache')
const babel = require('gulp-babel')
const clean = require('gulp-clean')
const concat = require('gulp-concat')
const eslint = require('gulp-eslint')
const rename = require('gulp-rename')
const uglify = require('gulp-uglify')
const minify = require('gulp-minifier')
const imagemin = require('gulp-imagemin')
const cleanCSS = require('gulp-clean-css')
const jsonmin = require('gulp-json-minify')
const sourcemaps = require('gulp-sourcemaps')
const { src, dest, watch, series, parallel } = require('gulp')

function cssTranspile () {
    return src('src/scss/**/*.scss')
        .pipe(sass())
        .pipe(dest('tmp/styles'))
}

function cssMinify () {
    return src('tmp/styles/**/*.css')
        .pipe(sourcemaps.init())
        .pipe(cleanCSS({ compatibility: '*' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(sourcemaps.write())
        .pipe(dest('dist/css'))
}

function jsTranspile () {
    return src('src/js/**/*.js')
        .pipe(babel({ presets: ['@babel/env'] }))
        .pipe(dest('tmp/js'))
}

function htmlMinify () {
    return src('src/**/*.html')
        .pipe(minify({
            minify: true,
            minifyHTML: {
                minifyJS: true,
                minifyCSS: true,
                removeComments: true,
                collapseWhitespace: true,
                conservativeCollapse: true
            }
        }))
        .pipe(dest('dist'))
}

function imageMinify () {
    return src('src/img/**/*.+(png|jpg|gif|svg)')
        .pipe(cache(imagemin({
            interlaced: true,
            progressive: true,
            svgoPlugins: [{ cleanupIDs: false }]
        })))
        .pipe(dest('dist/img'))
}

function jsonMinify () {
    return src('src/**/*.json')
        .pipe(jsonmin())
        .pipe(dest('dist'))
}

function jsMinifyOthers () {
    return src('tmp/js/*.js')
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(dest('dist/js'))
}

function jsMinifyContentScripts () {
    return src('tmp/js/contentscripts/*.js')
        .pipe(concat('contentscripts.js'))
        .pipe(dest('tmp/bundle/js'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(dest('dist/js'))
}

function jsMinifyBackground () {
    return src('tmp/js/background/*.js')
        .pipe(concat('background.js'))
        .pipe(dest('tmp/bundle/js'))
        .pipe(rename({ suffix: '.min' }))
        .pipe(uglify())
        .pipe(dest('dist/js'))
}

function jsLint () {
    return src('src/js/**/*.js')
        .pipe(eslint({
            env: {
                es6: true
            }
        }))
        .pipe(eslint.format())
        .pipe(eslint.failAfterError())
}

const jsMinify = parallel(jsMinifyBackground, jsMinifyContentScripts, jsMinifyOthers)

function zipFiles () {
    return src('dist')
        .pipe(zip('snippetify.zip'))
        .pipe(dest('./'))
}

function removeZip () {
    return src('snippetify.zip', { read: false, allowEmpty: true }).pipe(clean())
}

function cleanTmp () {
    return src('tmp', { read: false, allowEmpty: true }).pipe(clean())
}

function cleanDist () {
    return src('dist', { read: false, allowEmpty: true }).pipe(clean())
}

function watchFiles (cb) {
    watch('src/*.json', series(jsonMinify))
    watch('src/*.html', series(htmlMinify))
    watch('src/js/**/*.js', series(jsLint, jsTranspile, jsMinify))
    watch('src/scss/**/*.scss', series(cssTranspile, cssMinify))
    watch('src/img/**/*.+(png|jpg|gif|svg)', series(imageMinify))
    cb() // Async completion
}

exports.clean = parallel(cleanDist, cleanTmp, removeZip)
exports.watch = watchFiles
exports.default = series(
    cleanDist,
    parallel(jsLint),
    parallel(jsTranspile, cssTranspile),
    parallel(cssMinify, jsMinify, htmlMinify, imageMinify, jsonMinify),
    zipFiles,
    cleanTmp
)
