var PluginHost = (function () {
    function PluginHost() {
        this._accessToken = null;
        this._trcEndpoint = null;
        this._trcEndpoint = this.getCookie(PluginHost.cookieEndpoint);
    }
    PluginHost.prototype.getCookie = function (cname) {
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
    };
    PluginHost.prototype.httpGet = function (path, onSuccess) {
        var _this = this;
        $.ajax({
            url: this._trcEndpoint + path,
            type: "GET",
            contentType: "application/json",
            beforeSend: function (xhr) {
                xhr.setRequestHeader('accept', 'application/json');
                xhr.setRequestHeader("Authorization", "Bearer " + _this._accessToken);
            },
            success: onSuccess,
            error: function (xhr, statusText, errorThrown) {
                alert('Failed call:' + path + ", " + statusText);
            }
        });
    };
    PluginHost.prototype.SetAccessToken = function (accessToken) {
        this._accessToken = accessToken;
        this.showCurrentUser();
    };
    PluginHost.prototype.showCurrentUser = function () {
        var _this = this;
        this.httpGet("/me", function (resultJson) {
            var email = resultJson.Email;
            var pic = resultJson.PictureUri;
            $("#DBG_showName").text(email);
            $("#DBG_showPic").attr("src", pic);
            _this.showSheets();
        });
    };
    PluginHost.prototype.showSheets = function () {
        this.httpGet("/sheets", function (resultJson) {
            var records = resultJson.Results;
            var table = $("#sheetList");
            for (var i in records) {
                var record = records[i];
                var sheetId = record.SheetId;
                var sheetName = record.Name;
                var sheetVer = record.LatestVersion;
                var sheetCount = record.CountRecords;
                if (record.ParentName != null) {
                    sheetName += " (" + record.ParentName + ")";
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
    };
    PluginHost.prototype.selectMe = function (sheetId) {
        $("#DBG_showCurrentUser").hide();
        $("#DBG_showSelector").hide();
        var sheetRef = {
            AuthToken: this._accessToken,
            Server: this._trcEndpoint,
            SheetId: sheetId
        };
        PluginMain(sheetRef);
    };
    PluginHost.cookieEndpoint = "dbg-endpoint";
    PluginHost.cookieCurUser = "dbg-curuser";
    return PluginHost;
}());
var _xxxhost = new PluginHost();
function XXXselectMe(sheetId) {
    _xxxhost.selectMe(sheetId);
}
$(function () {
    var cookieVal = _xxxhost.getCookie(PluginHost.cookieCurUser);
    var elemDiv = document.createElement('div');
    var elemDiv2 = $(elemDiv);
    elemDiv2.load('/XXXnavbar.html', function () {
        window.document.body.insertBefore(elemDiv, window.document.body.firstChild);
        if (cookieVal != "") {
            $("#DBG_showLogin").hide();
            _xxxhost.SetAccessToken(cookieVal);
        }
        else {
            $("#DBG_showCurrentUser").hide();
            $("#DBG_showSelector").hide();
        }
    });
});
