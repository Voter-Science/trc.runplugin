// Server that emulates a TRC plugin host. 
// This is responsible for Login, selecting a sheet, and serving up the plugin. 
// The server (app) serves up a static directory (the plugin), and also 
// provides /local* hooks for login and communicating back with the server. 
//
// Usage:
//   node index.js [dir]
//       will serve up dir\index.html.  Provides in-browser login. 
// 
//   node index.js [dir] -auth [authfile]
//       if [authfile] exists, then skips the login and jumps right in. 
//       if file does not exist, does normal in-browser login and will save afterwards. 

declare var require: any;
declare var process: any;
declare var __dirname: any;


var request = require('request');
const path = require('path');
var fs = require('fs');
var express = require('express');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');

// Same as ISheetReference
// This is the file format that the config file is saved as. 
export class Credentials {
    AuthToken: string;
    Server: string;
    SheetId: string;
}

export class RunnerConfig {
    public dir: string; // required  directory to server from 
    public authFile: string; // optional 

    public Creds: Credentials; // parsed version of authFile
}

function readFileAsString(serverPath: string): string {
    var x = fs.readFileSync(serverPath);
    var xstr = x.toString('utf8');
    return xstr;
}
function writeFileAsString(serverPath: string, contents: string): void {
    fs.writeFileSync(serverPath, contents);
}

// Parse the config from command line options. 
export function Parse(): RunnerConfig {
    var config = new RunnerConfig();

    // print process.argv
    // process.argv.forEach((val: any, index: any, array: any) => {
    //     console.log(index + ': ' + val);
    // });

    //[0] is node.exe, [1] is index.js; so start at 2
    var args: string[] = process.argv;

    var dir = args[2];
    if (!dir) {
        console.log("Pass cmd line arg to directory that plugin is in. Should be an index.html file there. ");
        process.exit(1);
    }

    // Use builtin test redirect page 
    if (dir == 'x')
    {
        dir = path.join(__dirname, '..', 'test');
    }

    for (var idx = 3; idx < args.length; idx++) {
        var val = args[idx];
        if (val == "-auth") {
            config.authFile = args[idx + 1];
            console.log("Using auth file: " + config.authFile);

            try {
                var body = readFileAsString(config.authFile);
                config.Creds = JSON.parse(body);
                console.log("   Server: " + config.Creds.Server);
                console.log("  SheetId: " + config.Creds.SheetId);
            }
            catch (err) {
                console.log("  File not found. Will write new one after login.");
            }
        }
    }
    console.log();

    config.dir = dir;
    return config;

}

export class Runner {

    private _app :any;
    private _server :any;    

    public stop() : void {
        // BUG - This will stop new connections; but existing connections can still be running.
        // Browsers may keep existing connections open for minutes, so this won't exit. 
        // Need to track 
        this._server.close( () => { 
            console.log(">> Server closed.");
        });
        this._server = null;
    }

    // Spin up the web server for login and hosting a plugin
    public start(_cfg?: RunnerConfig): void {
        // Pass cmd line arg to directory that plugin is in. Should be an index.html file there. 
        //argv[0] is node.exe, arg[1] is 'index.js'
        // -auth [filename]
        if (!_cfg) {
            _cfg = Parse();
        }

        var app = express();


        // parse application/x-www-form-urlencoded 
        app.use(bodyParser.urlencoded({ extended: false }))
        app.use(bodyParser.json())
        app.use(cookieParser());
        var cookieEndpoint = "dbg-endpoint"; // server endpoint, ie "http://localhost:40176"
        var cookieCurUser = "dbg-curuser"; // Full JWT from a succesful login 
        var cookieSheetId = "dbg-sheetid";

        // Auth flow is described at: https://github.com/Voter-Science/TrcLibNpm/wiki/Authentication 
        var login = {
            client_id: 'local',
            redirect_uri: 'http://localhost:3000/local/redirect'
        };

        //app.use(express.static(path.join(__dirname, 'src'))); // serve up login scripts
        app.use(express.static(__dirname)); // serve up login scripts

        // Order matters! 

        // Intercept the start page and flip the host script 
        var indexHtml = "index.html";
        app.get("/" + indexHtml, (req: any, res: any) => {
            var xstr = readFileAsString(path.join(_cfg.dir, indexHtml));

            // Switch from legacy plugin host to the new one. 
            var originalHost = "https://trcanvasdata.blob.core.windows.net/code2/plugin.js"
            xstr = xstr.replace(originalHost, '/XXXHost.js'); // case sensitive

            var creds = _cfg.Creds;
            if (!!creds) {
                res.cookie(cookieCurUser, creds.AuthToken);
                res.cookie(cookieEndpoint, creds.Server);
                res.cookie(cookieSheetId, creds.SheetId);
            } else {
                res.cookie(cookieSheetId, "");
            }

            res.send(xstr);
        });

        app.use(express.static(_cfg.dir));

        // Browser calls this once we finish login. 
        // It's a chance to save the login creds the user selected.
        // Response is ignored. 
        app.post("/local/save", (req: any, res: any) => {
            var q = <Credentials>req.body;
            
            if (!!_cfg.authFile) {
                console.log("Saving credentials to: " + _cfg.authFile);

                var str = JSON.stringify(q, null, 4);
                writeFileAsString(_cfg.authFile, str);
            }
        });


        app.post("/local/login", (req: any, res: any) => {
            var trcEndpoint = req.body.LocalDbgloginurl;

            res.cookie(cookieEndpoint, trcEndpoint);
            //  GET {endpoint}/web/login?client_id={clientId}&response_type=code&redirect_uri={redirectUri} 
            res.redirect(trcEndpoint + "/web/login" +
                "?client_id=" + login.client_id +
                "&response_type=code" +
                "&redirect_uri=" + login.redirect_uri);
        });

        app.get("/local/logout", (req: any, res: any) => {
            res.cookie(cookieCurUser, "", { expires: new Date() });
            res.redirect("/" + indexHtml);
        });

        app.get("/local/redirect", (req: any, res: any) => {
            var q = req.query;
            var code = req.query.code;
            var errorX = req.query.error;

            var trcEndpoint = req.cookies[cookieEndpoint];

            //  POST {endpoint}/web/login/gettoken 
            // Do token exchange. 
            // Configure the request
            var options = {
                url: trcEndpoint + '/web/login/gettoken',
                method: 'POST',
                form: {
                    'code': code,
                    'grant_type': 'authorization_code',
                    'redirect_uri': login.redirect_uri,
                    'client_id': login.client_id
                }
            }

            request(options, (error: any, response: any, body: any) => {
                if (!error && response.statusCode == 200) {
                    // Body is Json. Parse and get 'AccessToken' 
                    var x = JSON.parse(body);
                    var accessToken = x["access_token"];

                    // Set cookie; redirect to homepage. 
                    // Homepage will now detect the cookie and display a nav bar. 
                    // NavBar has controls to eventually call PluginMain()
                    res.cookie(cookieCurUser, accessToken);
                    res.redirect("/" + indexHtml);

                }
            })

        });

        this._app = app;
        this._server = app.listen(3000, () => {
            // Print this on startup after listener has started
            console.log('Launch this URL in a browser to test your plugin:');
            console.log('  http://localhost:3000/index.html');
        });

        // Shutdown by calling server.close()
    } // start()
} // runner
