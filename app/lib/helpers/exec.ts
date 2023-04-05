import util from 'util';

const exec = util.promisify(require('child_process').exec);

export default exec;
