import chalk from "chalk";

const basic = (msg) =>
  console.log(chalk.gray("[LOG] " + msg));
const info = (msg) =>
  console.log(chalk.blue("[INFO] " + msg));
const success = (msg) =>
  console.log(chalk.green("[SUCCESS] " + msg));
const warn = (msg) =>
  console.log(chalk.yellow("[WARN] " + msg));
const error = (msg) =>
  console.log(chalk.red("[ERROR] " + msg));
const debug = () =>
  console.log(chalk.bgGray("         HEY THERE!         "));

const hey = { basic, info, success, warn, error, debug };

export default hey;
