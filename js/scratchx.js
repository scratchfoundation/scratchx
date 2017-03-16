// Simulate the bare minimum of the view that exists on the main site
var Scratch = Scratch || {};
Scratch.editorIsReady = false;
Scratch.FlashApp = Scratch.FlashApp || {};

var editorId = "scratch";
var initialPage = "home";
var ShortURL = {
    key : "AIzaSyBlaftRUIOLFVs8nfrWvp4IBrqq9-az46A",
    api : "https://www.googleapis.com/urlshortener/v1/url",
    domain : "http://goo.gl"
};

function handleEmbedStatus(e) {
    $('#scratch-loader').hide();
    var scratch = $(document.getElementById(editorId));
    if (!e.success) {
        scratch.css('marginTop', '10');
        scratch.find('IMG.proj_thumb').css('width', '179px');
        scratch.find('DIV.scratch_unsupported').show();
        scratch.find('DIV.scratch_loading').hide();
    } else {
        Scratch.FlashApp.ASobj = scratch[0];
        Scratch.FlashApp.$ASobj = $(Scratch.FlashApp.ASobj);
    }
}

// enables the SWF to log errors
function JSthrowError(e) {
    if (window.onerror) window.onerror(e, 'swf', 0);
    else console.error(e);
}

function JSeditorReady() {
    try {
        Scratch.editorIsReady = true;
        Scratch.FlashApp.$ASobj.trigger("editor:ready");
        return true;
    } catch (error) {
        console.error(error.message, "\n", error.stack);
        throw error;
    }
}

function JSshowExtensionDialog() {
    showModal(["template-extension-file", "template-extension-url"]);
}

var flashVars = {
    autostart: 'false',
    extensionDevMode: 'true',
    server: encodeURIComponent(location.host),
    cloudToken: '4af4863d-a921-4004-b2cb-e0ad00ee1927',
    cdnToken: '34f16bc63e8ada7dfd7ec12c715d0c94',
    urlOverrides: {
        sitePrefix: "http://scratch.mit.edu/",
        siteCdnPrefix: "http://cdn.scratch.mit.edu/",
        assetPrefix: "http://assets.scratch.mit.edu/",
        assetCdnPrefix: "http://cdn.assets.scratch.mit.edu/",
        projectPrefix: "http://projects.scratch.mit.edu/",
        projectCdnPrefix: "http://cdn.projects.scratch.mit.edu/",
        internalAPI: "internalapi/",
        siteAPI: "site-api/",
        staticFiles: "scratchr2/static/"
    },
    inIE: (navigator.userAgent.indexOf('MSIE') > -1)
};

var params = {
    allowscriptaccess: 'always',
    allowfullscreen: 'true',
    wmode: 'direct',
    menu: 'false'
};

$.each(flashVars, function (prop, val) {
    if ($.isPlainObject(val)) {
        val = encodeURIComponent(JSON.stringify(val));
    }
    if (typeof params.flashvars !== 'undefined') {
        params.flashvars += '&' + prop + '=' + val;
    } else {
        params.flashvars = prop + '=' + val;
    }
});

swfobject.switchOffAutoHideShow();

var swfAttributes = {
    data: 'Scratch.swf',
    width: '100%',
    height: '100%'
};

swfobject.addDomLoadEvent(function() {
    // check if mobile/tablet browser user bowser
    if(bowser.mobile || bowser.tablet) {
        // if on mobile, show error screen
        handleEmbedStatus({success: false});
    } else {
        // if not on ie, let browser try to handle flash loading
        var swf = swfobject.createSWF(swfAttributes, params, "scratch");
        handleEmbedStatus({success: true, ref: swf});
    }
});


/* File uploads */
function sendFileToFlash(file) {
    /*
     * Use the HTML5 FileReader API to send base-64 encoded file
     * contents to Flash via ASloadBase64SBX (or do it when the SWF
     * is ready).
     */
    var fileReader = new FileReader();
    fileReader.onload = function (e) {
        var fileAsB64 = ab_to_b64(fileReader.result);
        if (Scratch.FlashApp.ASobj.ASloadBase64SBX !== undefined) {
            $(document).trigger("editor:extensionLoaded", {method: "file"});
            showPage(editorId);
            Scratch.FlashApp.ASobj.ASloadBase64SBX(fileAsB64);
        } else {
            $(document).on("editor:ready", function(e) {
                $(document).trigger("editor:extensionLoaded", {method: "file"});
                showPage(editorId);
                Scratch.FlashApp.ASobj.ASloadBase64SBX(fileAsB64);
                $(this).off(e);
            });
        }
        
    };
    fileReader.readAsArrayBuffer(file);
}

function sendURLtoFlash() {
    /*
     * Send a URL to Flash with ASloadGithubURL, or do it when the
     * editor is ready.
     */
    var urls = [];
    for (var i = 0; i < arguments.length; i++) {
        urls.push(arguments[i]);
    }
    if (urls.length <= 0) return;
    if (Scratch.editorIsReady) {
        $(document).trigger("editor:extensionLoaded", {method: "url", urls: urls});
        showPage(editorId);
        Scratch.FlashApp.ASobj.ASloadGithubURL(urls);
    } else {
        $(document).on("editor:ready",  function(e) {
            $(document).trigger("editor:extensionLoaded", {method: "url", urls: urls});
            showPage(editorId);
            Scratch.FlashApp.ASobj.ASloadGithubURL(urls);
            $(this).off(e);
        });
    }
}


/* Load from URL */

function loadFromURLParameter(queryString) {
    /*
     * Get all url=urlToLoad from the querystring and send to Flash
     * Use like...
     *     http://scratchx.org/?url=urlToLoad1&url=urlToLoad2
     */
    var paramString = queryString.replace(/^\?|\/$/g, '');
    var vars = paramString.split("&");
    var urls = [];
    for (var i=0; i<vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair.length > 1 && pair[0]=="url") {
            urls.push(pair[1]);
        }
    }
    if (urls.length > 0) sendURLtoFlash.apply(window, urls);
}

/* Modals */

function getOrCreateFromTemplate(elementId, templateId, elementType, appendTo, wrapper, data) {
    elementType = elementType || "div";
    appendTo = appendTo || "body";
    data = data || {};

    var $element = $(document.getElementById(elementId));
    if (!$element.length) {
        var templateContent = "";
        if (typeof(templateId) != "string") {
            for (var id in templateId) {
                templateContent += $(document.getElementById(templateId[id])).html();
            }
        } else {
            templateContent += $(document.getElementById(templateId)).html()
        }
        $template = _.template(templateContent);
        $element = $("<"+elementType+"></"+elementType+">")
            .attr("id", elementId)
            .html($template(data));
        if (wrapper) $element.wrapInner(wrapper);
        $element.appendTo(appendTo)
    }
    return $element;
}

function showModal(templateId, data) {
    /*
     * Copies the HTML referenced by data-template into a new element,
     * with id="modal-[template value]" and creates an overlay on the
     * page, which when clicked will close the popup.
     */

    var zIndex = 100;
    var modalId = ("modal-" + templateId).replace(",", "-");
    $modalwrapper = $("<div class='modal-fade-screen'><div class='modal-inner'></div></div>");
    var $modal = getOrCreateFromTemplate(modalId, templateId, "dialog", "body", $modalwrapper, data);

    $modal.addClass("modal");

    $(".modal-fade-screen", $modal)
        .addClass("visible")
        .click(function(e){if ($(e.target).is($(this))) $(this).trigger("modal:exit")});

    $(".modal-close", $modal).click(function(e){
        e.preventDefault();
        $(document).trigger("modal:exit")
    });
    
    $("body").addClass("modal-open");

    $(document).one("modal:exit page:show editor:extensionLoaded", function(e){
        $("body").removeClass("modal-open");
        try {
            Scratch.FlashApp.ASobj.ASsetModalOverlay(false);
        } catch (e) {
            // SWF not yet loaded
        }
        $modal.remove();
    });
    
    return $modal;
}

$(document).keyup(function(e) {
    // Exit modals with esc key
    if (e.keyCode == 27) $(document).trigger("modal:exit");
});

$(document).on("modal:exit", function(e){
    try {
        Scratch.FlashApp.ASobj.ASsetModalOverlay(false);
    } catch (e) {
        // SWF not yet loaded
    }
});

$(document).on('click', "[data-action='modal']", function(e){
    /*
     * Usage:
     *     <a href="#content" data-action="modal" data-template="id-for-content">Popup</a>
     */

    e.preventDefault();
    showModal($(this).data("template"));
});

function JSshowWarning(extensionData) {
    $modal = showModal("template-warning", extensionData);
    $("button", $modal).click(function(e){
        e.preventDefault();
        $(document).trigger("modal:exit")
    });
}


/* Page switching */
function showPage(path, force) {
    /*
     Show a part of the page.  The site is set up like
     body
       main
         article#home
         article#privacy-policy
         ...
       editor
     
     Each <article> is a "page" of the site, plus one special
     view, which is the editor.
     
     The editor is not actually hidden, but located -9999px above
     the viewport. This is because if it's hidden, it doesn't load
     when the page is loaded.
          So first we have to hide everything that we're not going to show
     or move the editor up, then display everything we're going to show
     if it's hidden.
          If we are linking to an anchor within a page, then show its parent.
    */
    var toHide = "body > main, body > main > article";
    var toShow = "#" + path;
    var $toShow = $(toShow);
    var showEditor = $toShow.is(Scratch.FlashApp.$ASobj);
    var editorShown = parseInt(Scratch.FlashApp.$ASobj.css("top")) == 0;

    if (!$toShow.length || (!showEditor && $toShow.filter(":visible").length > 0) || (showEditor && editorShown)) return;
    
    if (editorShown && !force) {
        Scratch.FlashApp.ASobj.AScreateNewProject(["showPage", path, true]);
        return;
    }

    $(toHide).filter(":visible").hide();
    if (!showEditor && editorShown) $(document.getElementById(editorId)).css({top: "-9999px"});
    $("body > main, body > main > article").has($toShow).show();
    setBodyClass(path);
    $toShow.show();

    if (showEditor) $toShow.css({top: 0});
    
    if (document.location.hash.substr(1) != path) document.location.hash = path;
    $toShow[0].scrollIntoView(true);
    $(document).trigger("page:show", path);
}

function setBodyClass(path) {
    var pageClassPrefix = "page-";
    var currentPageClasses = ($("body").attr("class") || "").split(" ");
    for (c in currentPageClasses) {
        if (currentPageClasses[c].indexOf(pageClassPrefix) != -1) {
            $("body").removeClass(currentPageClasses[c]);
        }
    }
    $("body").addClass(pageClassPrefix + path);
}

/* URL Shortening */
function shorten(url, done) {
    var data = {longUrl: url};
    $.ajax({
        url : ShortURL.api + '?' + $.param({key : ShortURL.key}),
        type : "post",
        data : JSON.stringify(data),
        dataType : "json",
        contentType : "application/json"
    }).done(done);
}

function getUrlFor(extensions) {
    return document.location.origin + '/?' + $.param(
        extensions.map(function(url){
            return {name: 'url', value: url}
        })
    );
}

function UrlParser(url) {
    parser = document.createElement('a');
    parser.href = url;
    return parser
}

function showShortUrl(url) {
    shorten(url, function(data) {
        var parser = UrlParser(data.id);
        var id = parser.pathname.replace('/', '');
        parser.href = window.location.origin;
        parser.hash = "#!" + id;
        var shortUrl = parser.href;
        var context = {
            longUrl : data.longUrl,
            shortUrl : shortUrl
        };

        $modal = showModal("template-short-url", context);
        var client = new ZeroClipboard($('button', $modal));
    });
}

function JSshowShortUrlFor() {
    showShortUrl(getUrlFor(Array.prototype.slice.call(arguments)));
}

function decompress(id, done) {
    var data = {shortUrl: ShortURL.domain + id};
    $.ajax({
        url : ShortURL.api + '?' + $.param({
            key : ShortURL.key,
            shortUrl : ShortURL.domain + '/' + id}),
        dataType : "json",
        contentType : "application/json"
    }).done(done);
}

/* Setup */

$(document).on('click', "[data-action='load-file']", function(e) {
    /*
    Buttons with data-action="load-file" trigger a file input
    prompt, passed to a handler that passes the file to Flash.
    */
    $('<input type="file" />').on('change', function(){
        sendFileToFlash(this.files[0])
    }).click();
});

$(document).on('click', "[data-action='load-url']", function(e) {
    /*
    Links with data-action="load-url" send their href to Flash
    So use like...
       <a href="?url=urlToLoad" data-action="load-url">Load this</a>
    */
    e.preventDefault();
    showPage(editorId);
    loadFromURLParameter($(this).attr("href"));
});

$(document).on('submit', ".url-load-form", function(e) {
    // Load text input value on submit
    e.preventDefault();
    showPage(editorId);
    sendURLtoFlash($('input[type="text"]', this).val());
});

$(document).on('click', "[data-action='show']", function(e) {
    /*
    Links with data-action="static-link" should switch the view
    to that page. Works like tabs sort of. Use like...
        <!-- Makes a link to the Privacy Policy section -->
        <a href="#privacy-policy" data-action="static-link">Privacy Policy</a>
    */
    var path = $(this).data('target') || $(this).attr("href").substring(1);
    showPage(path);
});

$(window).on('hashchange', function(e) {
    var path = document.location.hash.split('#')[1] || document.location.hash || 'home';
    if (path.charAt(0) != '!') showPage(path);
});

$(document).on("page:show", function(e, page){
    ga("send", "pageview", '#' + page);
    ga("set", "referrer", document.location.origin + document.location.pathname + document.location.hash)
});

$(document).on("editor:extensionLoaded", function(e, data){
    if (data.method == "url") {
        for (var i = 0; url = data['urls'][i]; i++) {
            ga("send", "event", "extensionLoaded", data.method, url);
        }
    } else {
        ga("send", "event", "extensionLoaded", data.method);
    }
});

function initPage() {
    /*
    On load, show the page identified by the URL fragment. Default to #home.
    */
    if (window.location.hash) {
        if (window.location.hash.charAt(1) == "!") {
            decompress(window.location.hash.substr(2), function(data) {
                var parser = UrlParser(data.longUrl);
                if (parser.hostname == window.location.hostname) window.location = data.longUrl;
                return;
            });
        } else {
            initialPage = window.location.hash.substr(1);
        }
    }
    setBodyClass(initialPage);
    showPage(initialPage, true);
    loadFromURLParameter(window.location.search, true);
}
$(initPage);
