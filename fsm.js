/* File sort mover */
const fs = require('fs');
const util = require('util');
const path = require('path');
const mkdirp = util.promisify(require('mkdirp'));
const readdir = util.promisify(fs.readdir);
const copyFile = util.promisify(fs.copyFile);
const unlink = util.promisify(fs.unlink);
const rmdir = util.promisify(fs.rmdir);
const { COPYFILE_EXCL } = fs.constants;

class Unit {
  constructor (src, dest, unlink) {
    this.src = src;
    this.dest = dest;
    this.unlink = unlink;
  }

  replace () {
    return mkdirp(path.parse(this.dest).dir)
      .catch(err => {
        if (err.code !== 'EEXIST') throw err;
        return true;
      })
      .then(() => {
        return copyFile(this.src, this.dest, COPYFILE_EXCL);
      })
      .then(() => {
        if (this.unlink) {
          return unlink(this.src);
        } else {
          return true;
        }
      })
      .then(() => {
        console.log(`file ${this.src} copied to ${this.dest}`);
      })
      .catch(err => {
        throw err;
      });
  }
}

class Engine {
  constructor (src, dest, unlink) {
    this.filesq = [];
    this.dirdelsq = [];
    this.src = src;
    this.dest = dest;
    this.unlink = unlink;
    this.errors = [];
  }
  _readdir1 (dir) {
    const self = this;

    return new Promise(function (resolve, reject) {
      const stack = [];

      const _read = dir => {
        stack.push(1);
        self.dirdelsq.unshift(dir);

        return readdir(dir)
          .then(files => {
            files.forEach(file => {
              const filepath = path.join(dir, file);
              const stats = fs.statSync(filepath);

              if (stats.isDirectory()) {
                _read(filepath);
              } else {
                self.putfile(filepath, path.join(self.dest, file[0].toUpperCase(), file));
              }
            });
            stack.pop();
            if (stack.length === 0) resolve();
          })
          .catch(err => {
            self.errors.push(err);
          });
      };

      _read(dir);
    });
  }
  _rmfolders () {
    return Promise.all(
      this.dirdelsq.map(dir => {
        return rmdir(dir).catch(err => {
          this.errors.push(err);
        });
      })
    );
  }
  async _onprocend () {
    if (this.unlink && this.errors.length === 0) {
      return this._rmfolders().then(() => {
        return this.errors;
      });
    } else {
      return this.errors;
    }
  }
  async proc () {
    await this._readdir1(this.src);
    await Promise.all(
      this.filesq.map(unit => {
        return unit.replace().catch(err => {
          this.errors.push(err);
        });
      })
    );
    return this._onprocend();
  }
  putfile (srcfile, destfile) {
    const unit = new Unit(srcfile, destfile, this.unlink);
    this.filesq.push(unit);
  }
}

module.exports.Engine = Engine;
