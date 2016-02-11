const babel     = require("gulp-babel");
const compass   = require("gulp-compass");
const concat    = require("gulp-concat");
const gulpif    = require('gulp-if');
const gulp      = require("gulp");
const minifyCss = require("gulp-minify-css");
const uglify    = require('gulp-uglify');
const util      = require('gulp-util');

const exec      = require('child_process').exec;
const fs        = require('fs');
const _         = require('lodash');

const jsSources = './src/*.js';

gulp.task('js', () => {
  return gulp.src(jsSources).
    pipe(babel()).
    pipe(uglify({
      mangle: true,
      compress: { drop_console: true }
    })).
    pipe(gulp.dest('./dist'));
});

gulp.task('fileWatch', () => {
  gulp.watch(jsSources, ['js']);
});

gulp.task('bookmarklet', () => {
  const readFile = path => fs.readFileSync(path).toString();
  const jsWrap = js => 'javascript:(function(){'+js.replace(/\t/g,'\\t')+'})();';

  const code = readFile('dist/app.js');
  const lines = readFile('README.md').toString().split(/\r?\n/);
  const updatedReadMe = _.reduce(lines, (acc, line) => {
    if (line.indexOf('javascript:') === 0) {
      acc.push(jsWrap(code));
    } else {
      acc.push(line);
    }
    return acc;
  }, []).join('\n');

  fs.writeFile('./dist/bookmarklet.js', jsWrap(code));
  fs.writeFile('README.md', updatedReadMe);
});

gulp.task('default', ['js']);
gulp.task('watch', ['js', 'fileWatch']);
