// This is the Script file that the plugin's Index.html will pull in. 
// It runs int the context of the browser and can assume that JQuery is loaded. 
//  It is a mini-host and responsible to log the user in and select a sheet.
// It should then call plugin PluginMain() 

declare var $: any; // JQuery

// The response back from a login. This provides access to a sheet. 
interface ISheetReference {
    AuthToken: string;
    Server: string;
    SheetId: string;
}

// The plugin implements this. 
declare function PluginMain(sheetRef: ISheetReference): void;

// Response to GET  /permissions/sheets
interface ISheetListResponse {
    Results: ISheetEntry[];
}
interface ISheetEntry {
    SheetId: string;
    Name: string;
    ParentName: string;
    Version: number;
    CountRecords: number;
}

// Class to encapsulate hosting operations. 
class PluginHost {
    _accessToken: string = null;
    
    _trcEndpoint: string = null;

    public static cookieEndpoint = "dbg-endpoint"; // server endpoint, ie "http://localhost:40176"
    public static cookieCurUser = "dbg-curuser" ; // Full JWT from a succesful login 
    

    constructor()
    {
        // Get endpoint from cookies. This is set at login.
        this._trcEndpoint = this.getCookie(PluginHost.cookieEndpoint);
    }

    // Helper to get a cookie 
    public getCookie(cname: string): string {
        var name = cname + "=";
        var decodedCookie = decodeURIComponent(document.cookie);
        var ca = decodedCookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

    private httpGet(
        path: string, // eg "/user"
        onSuccess: (body: any) => void
    ): void {
        $.ajax({
            url: this._trcEndpoint + path,
            type: "GET",
            contentType: "application/json",
            beforeSend: (xhr: any) => {
                xhr.setRequestHeader('accept', 'application/json');
                xhr.setRequestHeader("Authorization", "Bearer " + this._accessToken);
            },
            success: onSuccess,
            error: (xhr: any, statusText: any, errorThrown: any) => {
                alert('Failed call:' + path + ", " + statusText);
            }
        });
    }

    // Set the access token and trigger the UI for selecting a sheet. 
    public SetAccessToken(accessToken : string ) : void {
        this._accessToken = accessToken;
        this.showCurrentUser();
    }

    // Id, Email, Name,  PictureUri
    private showCurrentUser(): void {
        this.httpGet("/me",
            (resultJson: any) => {
                var email = resultJson.Email;
                var pic = resultJson.PictureUri;

                $("#DBG_showName").text(email);
                $("#DBG_showPic").attr("src", pic);

                this.showSheets();
            });
    }

    private showSheets(): void {
        this.httpGet("/sheets",
            (resultJson: ISheetListResponse) => {
                var records = resultJson.Results;

                var table = $("#sheetList");
                for (var i in records) {
                    var record: ISheetEntry = records[i];
                    var sheetId = record.SheetId;
                    var sheetName = record.Name;
                    var sheetVer = record.Version;
                    var sheetCount = record.CountRecords;

                    if (record.ParentName != null)
                    {
                        sheetName += " ("  +record.ParentName +")";
                    }

                    var html = "<tr>" +
                        "<td><button onClick=\"XXXselectMe('" + sheetId + "')\">" + sheetName + "</button></td>" +
                        "<td>" + sheetCount + "</td>" +
                        "<td>" + sheetVer + "</td>" +
                        "</tr>";

                    var el = $(html);
                    table.append($(html));
                }
            });
    }

    public selectMe(sheetId: string): void {
        $("#DBG_showCurrentUser").hide();
        $("#DBG_showSelector").hide();

        var sheetRef: ISheetReference = {
            AuthToken: this._accessToken,
            Server: this._trcEndpoint,
            SheetId: sheetId
        };

        PluginMain(sheetRef);
    }
} // end class 

var _xxxhost = new PluginHost();

// Expose for control to tunnel in. 
function XXXselectMe(sheetId : string) : void 
{
    _xxxhost.selectMe(sheetId);
}

// Top level hook 
$(function () {
        
    // On startup 
    var cookieVal = _xxxhost.getCookie(PluginHost.cookieCurUser);

    // Inject the NavBar into the top of the document 
    var elemDiv = document.createElement('div');

    var elemDiv2 = $(elemDiv);
    elemDiv2.load('/XXXnavbar.html', function () {
        window.document.body.insertBefore(elemDiv,
            window.document.body.firstChild);

        // Load complete. Toggle items based on login status. 
        // (Alternatively, we could load different navbars)        
        if (cookieVal != "") {
            // Yes, we're logged in 
            $("#DBG_showLogin").hide();

            _xxxhost.SetAccessToken(cookieVal);
        }
        else {
            // Not logged in. Hide other controls and leave the login button. 
            // Using the login button will cause page redirects which will
            // result in re-running this method.          
            $("#DBG_showCurrentUser").hide();
            $("#DBG_showSelector").hide();
        }
    });
});