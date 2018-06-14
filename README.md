# trc.runpluginSimple NPM package to support running TRC plugins locally for debug purposes. 
This runs the TRC login flow (https://github.com/Voter-Science/TrcLibNpm/wiki/Authentication ) and provides a basic selector for list of sheets. It then  then invokes PluginMain(). 
https://github.com/Voter-Science/TrcPluginTemplate for more details about TRC plugins. 

# Command line 

Usage:

`
node index.js  %directory% [options]
`

Where %directory% is the location of the index.html file to launch in a browser. For most plugins using the default template, this is 'public'. 


Where options can be: 
`-auth %file%`
If specified, if the file exists, skip the user interactive login and directly load the credentials from the specified file (if exists). This can save time during development (especially if you have permission to a lot of sheets) or can be used if the interactive-login doesn't display in the plugin. 
AFter login, will write the credentials to this file for future use. 

The credentials include the JWT (a secret), sheetId, and server URL. 


# For calling from other plugins 
For plugins using this run harness, you can use the following snippet in that package's start script:  

`
  "scripts": {  
    "start": "npm run build && node node_modules/trc.runplugin/index.js public"
  },
`

This assumes that:

1. trc.runplugin package has been included `npm install trc.runplugin --save` and so is available in `node_modules/trc.runplugin`
2. the plugin's index.html is at `public/index.html`

Then you can run the plugin via: 

`
npm start
`

Or via: 

`
npm start -- -auth c:\secrets\test4.json
`

NPM requires the double dash ('--') to pass command line arguments through. 
