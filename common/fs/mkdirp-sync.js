/**
 * Synchronous recursive mkdir, like `mkdir -p`.
 *
 * @origin lighter-common/common/fs/mkdirp-sync.js
 * @version 0.0.1
 */

var path = require('path');
var resolve = path.resolve;
var dirname = path.dirname;

var mkdirp = module.exports = function (path, mode, fn) {
  path = resolve(path);
  if (typeof mode == 'function') {
    fn = mode;
    mode = 493; // 0777
  }
  mk(path, mode, fn || function () {});
};

function mk(path, mode, fn, dir) {
  try {
    mkdirp.fs.mkdirSync(path, mode);
    dir = dir || path;
    fn(null, dir);
  }
  catch (error) {
    if (error.code == 'ENOENT') {
      mk(dirname(path), mode, function (error, dir) {
        if (error) {
          fn(error, dir);
        }
        else {
          mk(path, mode, fn, dir);
        }
      });
    }
    else {
      try {
        var stat = mkdirp.fs.statSync(path);
        fn(stat.isDirectory() ? null : error, dir);
      }
      catch (statError) {
        fn(error, dir);
      }
    }
  }
}

// Allow a user to specify a custom file system.
mkdirp.fs = require('fs');
