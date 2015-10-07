// Handles prepublishing things for cross-platform reasons.
var path = require('path'),
  child_process = require('child_process');

function checkCode(code) {
  if (code != 0) {
    throw new Error("Program exited with code " + code);
  }
}

var options = {
  stdio: 'inherit', stderr: 'inherit'
}

child_process.spawn(path.resolve(".", "node_modules", '.bin', 'tsd'), ["install"], options)
  .on('close', function(code) {
    checkCode(code);
    child_process.spawn(path.resolve(".", "node_modules", '.bin', 'tsc'), options)
      .on('close', checkCode);
  });
