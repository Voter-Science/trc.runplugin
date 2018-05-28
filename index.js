// Command line start 

runner = require('./src/core.js');


var r = new runner.Runner();
r.start();

/* // Test shutdown 
console.log(">>>running");
setTimeout( function() { 
    console.log(">>>stopping");
    r.stop();
}, 5000);
*/