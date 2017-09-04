// Server that emulates a TRC plugin host. 
// This is responsible for Login, selecting a sheet, and serving up the plugin. 

var request = require('request');
const path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

// Pass cmd line arg to directory that plugin is in. Should be an index.html file there. 
var dir = process.argv[2];
if (dir == undefined || dir == null)
{
   console.log("Pass cmd line arg to directory that plugin is in. Should be an index.html file there. ");
   process.exit(1);
}


function readFileAsString(serverPath) 
{
    var x = fs.readFileSync(serverPath);    
    var xstr = x.toString('utf8');
    return xstr;
}

var app = express();


// parse application/x-www-form-urlencoded 
app.use(bodyParser.urlencoded({ extended: false }))
app.use(cookieParser());
var cookieEndpoint = "dbg-endpoint"; // server endpoint, ie "http://localhost:40176"
var cookieCurUser = "dbg-curuser" ; // Full JWT from a succesful login 

app.use(express.static(path.join(__dirname, 'src'))); // serve up login scripts

// Order matters! 

// Intercept the start page and flip the host script 
var indexHtml = "index.html";
app.get("/" + indexHtml, function (req, res) {
    var xstr = readFileAsString(path.join(dir, indexHtml));

    // Switch from legacy plugin host to the new one. 
    var originalHost = "https://trcanvasdata.blob.core.windows.net/code2/plugin.js"
    xstr = xstr.replace(originalHost, '/XXXhost.js');

    res.send(xstr);
});

app.use(express.static(dir));

app.post("/local/login", function (req, res) {
    var trcEndpoint = req.body.LocalDbgloginurl;

    res.cookie(cookieEndpoint, trcEndpoint);
    res.redirect(trcEndpoint + "/web/login?redirectUrl=http://localhost:3000/local/redirect");
});

app.get("/local/logout", function (req, res) {
    res.cookie(cookieCurUser, "", { expires: new Date() });
    res.redirect("/" + indexHtml);
});

app.get("/local/redirect", function (req, res) {
    var q = req.query;
    var code = req.query.code;
    var errorX = req.query.error;

    var trcEndpoint = req.cookies[cookieEndpoint];
    // Do token exchange. 
    // Configure the request
    var options = {
        url: trcEndpoint + '/web/login/gettoken',
        method: 'POST',
        form: {'code': code, 'AppName': 'local'}
    }

    request(options, function (error, response, body) {
        if (!error && response.statusCode == 200) {
            // Body is Json. Parse and get 'AccessToken' 
            var x = JSON.parse(body);
            var accessToken = x["AccessToken"];

            // Set cookie; redirect to homepage. 
            // Homepage will now detec thte cookie and display a nav bar. 
            // NavBar has controls to eventually call PluginMain()
            res.cookie(cookieCurUser, accessToken);                        
            res.redirect("/" + indexHtml);
            
        }
    })
   
  });

app.listen(3000, function () {
    console.log('Launch this URL in a browser to test your plugin:');
    console.log('  http://localhost:3000/index.html');
});
