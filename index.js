
// Pass cmd line arg to directory that plugin is in. Should be an index.html file there. 
var dir = process.argv[2];
if (dir == undefined || dir == null)
{
   console.log("Pass cmd line arg to directory that plugin is in. Should be an index.html file there. ");
   process.exit(1);
}

var express = require('express');
var app = express();
app.use(express.static(dir));
app.listen(3000, function () {
    console.log('Launch this URL in a browser to test your plugin:');
    console.log('  http://localhost:3000/index.html');
});
