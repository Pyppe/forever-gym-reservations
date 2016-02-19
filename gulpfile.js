const babel     = require("gulp-babel");
const compass   = require("gulp-compass");
const concat    = require("gulp-concat");
const gulpif    = require('gulp-if');
const gulp      = require("gulp");
const replace   = require('gulp-replace');
const minifyCss = require("gulp-minify-css");
const uglify    = require('gulp-uglify');
const util      = require('gulp-util');

const exec      = require('child_process').exec;
const fs        = require('fs');
const _         = require('lodash');

const distJs = 'dist/js';
const distCss = 'dist/css';
const CONFIG = require('./config.js');
console.log('Using environment: ' + CONFIG.env);

const paths = (() => {
  const vendorScripts = [
    'jquery.min.js',
    'tether.min.js',
    'bootstrap.min.js',
    'select2/select2.full.min.js',
    'select2/i18n/fi.js'
  ].map(name => `src/js/vendor/${name}`);

  const vendorCss = [
    'bootstrap.min.css',
    'select2.min.css',
  ].map(name => `src/css/vendor/${name}`);

  return {
    siteJs: 'src/js/*.js',
    vendorJs: vendorScripts,
    vendorCss : vendorCss,
    siteSass: 'src/sass/**/*.scss'
  };
})();

gulp.task('vendorCss', () => {
  return gulp.src(paths.vendorCss).
    pipe(minifyCss({compatibility: ''})).
    pipe(concat('vendor.css')).
    pipe(gulp.dest(distCss));
});

gulp.task('siteCss', () => {
  return gulp.src(paths.siteSass).
    pipe(compass({
      // config_file: 'public/config.rb'
      environment : 'production',
      style       : CONFIG.isProduction ? 'compact' : 'expanded',
      images_dir  : 'img',
      image       : 'img',
      css         : 'dist/css',
      javascript  : 'src/js',
      sass        : 'src/sass',
      relative    : false
    })).
    pipe(gulp.dest(distCss));
});

gulp.task('siteJs', () => {
  return gulp.src(paths.siteJs).
    pipe(babel()).
    pipe(gulpif(CONFIG.isProduction, uglify({
      mangle: true,
      compress: { drop_console: true }
    }))).
    pipe(concat('site.js')).
    pipe(gulp.dest(distJs));
});

gulp.task('vendorJs', () => {
  return gulp.src(paths.vendorJs).
    pipe(concat('vendor.js')).
    pipe(gulp.dest(distJs));
});

gulp.task('fileWatch', () => {
  gulp.watch(paths.siteJs, ['siteJs']);
  gulp.watch(paths.siteSass, ['siteCss']);
});

gulp.task('bookmarklet', () => {

  return gulp.src('src/bookmarklet.js').
    pipe(babel()).
    pipe(gulpif(CONFIG.isProduction || true, uglify({
      mangle: true,
      compress: { drop_console: true }
    }))).
    pipe(replace(/\t/g,'\\t')).
    pipe(replace(/^(.*)$/g,'javascript:(function(){$1})();')).
    pipe(replace('<BASEURL>', CONFIG.baseUrl)).
    pipe(gulp.dest('dist'));

  /*
  const readFile = path => fs.readFileSync(path).toString();
  const jsWrap = js => 'javascript:(function(){'+js.replace(/\t/g,'\\t')+'})();';

  const code = readFile('dist/app.js');
  fs.writeFile('./dist/bookmarklet.js', jsWrap(code));
  */

  /*
  const lines = readFile('README.md').toString().split(/\r?\n/);
  const updatedReadMe = _.reduce(lines, (acc, line) => {
    if (line.indexOf('javascript:') === 0) {
      acc.push(jsWrap(code));
    } else {
      acc.push(line);
    }
    return acc;
  }, []).join('\n');
  fs.writeFile('README.md', updatedReadMe);
  */
});

gulp.task('pipeline', ['siteJs', 'siteCss', 'vendorJs', 'vendorCss']);
gulp.task('default', ['pipeline', 'bookmarklet']);
gulp.task('watch', ['default', 'fileWatch']);
