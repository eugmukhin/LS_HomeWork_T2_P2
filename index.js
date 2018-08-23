const fsm = require('./fsm');

const src = process.argv[2];
const dest = process.argv[3];
const unlink = process.argv[4] === '-r';

if (!src || !dest) {
  console.log('usage: node index srcdir destrir [-r]');
  process.exit(0);
}

const mover = new fsm.Engine(src, dest, unlink);
mover.proc().then(errors => {
  if (errors.length > 0) {
    console.log('Please fix the error and try again.');
    errors.forEach(err => {
      console.log(err.message);
    });
  } else {
    console.log('Done');
  }
});
