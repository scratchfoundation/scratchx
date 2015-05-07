// Simulate the bare minimum of the view that exists on the main site
var Scratch = Scratch || {};
Scratch.FlashApp = Scratch.FlashApp || {};

function handleEmbedStatus(e) {
    $('#scratch-loader').hide();
    var scratch = $('#editor');
    if (!e.success) {
        scratch.css('marginTop', '10');
        scratch.find('IMG.proj_thumb').css('width', '179px');
        scratch.find('DIV.scratch_unsupported').show();
        scratch.find('DIV.scratch_loading').hide();
    } else {
        Scratch.FlashApp.ASobj = scratch[0];
    }
}

// enables the SWF to log errors
function JSthrowError(e) {
    if (window.onerror) window.onerror(e, 'swf', 0);
    else console.error(e);
}

function JSeditorReady() {
    try {
        handleParameters();
        $("#editor").trigger("editorReady");
        return true;
    } catch (error) {
        console.error(error.message, "\n", error.stack);
        throw error;
    }
}

function JSprojectLoaded() {
    loadExtensionQueue();
}

function JSshowExtensionDialog() {
    showModal("dialogs");
}

var extensionQueue = [];
function handleParameters() {
    var project;
    var queryString = window.location.search.substring(1);
    var queryVars = queryString.split(/[&;]/);
    for (var i = 0; i < queryVars.length; i++) {
        var nameVal = queryVars[i].split('=');
        switch(nameVal[0]){
            case 'ext':
                extensionQueue.push(nameVal[1]);
                break;
            case 'proj':
                project = nameVal[1];
                break;
        }
    }
    if (project) {
        Scratch.FlashApp.ASobj.ASloadSBXFromURL(project);
    }
    else {
        loadExtensionQueue();
    }
}

function loadExtensionQueue() {
    for (var i = 0; i < extensionQueue.length; ++i) {
        var extensionURL = extensionQueue[i];
        ScratchExtensions.loadExternalJS(extensionURL);
    }
    extensionQueue = [];
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
    if ($.isPlainObject(val))
        flashVars[prop] = encodeURIComponent(JSON.stringify(val));
});

swfobject.switchOffAutoHideShow();

swfobject.embedSWF('Scratch.swf', 'editor', '100%', '100%', '11.7.0', 'libs/expressInstall.swf',
        flashVars, params, null, handleEmbedStatus);


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
        showPage("editor");
        if (Scratch.FlashApp.ASobj.ASloadBase64SBX !== undefined) {
            Scratch.FlashApp.ASobj.ASloadBase64SBX(fileAsB64);
        } else {
            $(document).on("editorReady", function(e) {
                Scratch.FlashApp.ASobj.ASloadBase64SBX(fileAsB64);
                $(this).off(e);
            });
        }
        
    }
    fileReader.readAsArrayBuffer(file);
}

$("[data-action='load-file']").click(function(e) {
    /*
     * Buttons with data-action="load-file" trigger a file input
     * prompt, passed to a handler that passes the file to Flash.
     */
    $('<input type="file" />').on('change', function(){
        sendFileToFlash(this.files[0])
    }).click();
});

function sendURLtoFlash(url) {
    /*
     * Send a URL to Flash with ASloadGithubURL, or do it when the
     * editor is ready.
     */
    if (Scratch.FlashApp.ASobj.ASloadGithubURL !== undefined) {
        Scratch.FlashApp.ASobj.ASloadGithubURL(url);
    } else {
        $(document).on("editorReady",  function(e) {
            Scratch.FlashApp.ASobj.ASloadGithubURL(url);
            $(this).off(e);
        });
    }
}


/* Load from URL */
$("[data-action='load-url']").click(function(e) {
    /*
     * Links with data-action="load-url" send their href to Flash
     * So use like...
     *    <a href="?url=urlToLoad" data-action="load-url">Load this</a>
     */
    e.preventDefault();
    showPage("editor");
    sendURLtoFlash($(this).attr("href"));
});

$(".url-load-form").submit(function(e) {
    // Load text input value on submit
    e.preventDefault();
    showPage("editor");
    sendURLtoFlash($('input[type="text"]', this).val());
});

function loadFromURLParameter() {
    /*
     * Get all url=urlToLoad from the querystring and send to Flash
     * Use like...
     *     http://scratchx.org/?url=urlToLoad1&url=urlToLoad2
     */
    var paramString = window.location.search.replace(/^\?|\/$/g, '');
    var vars = paramString.split("&");
    var showedEditor = false;
    for (var i=0; i<vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair.length > 1 && pair[0]=="url") {
            if (!showedEditor) {
                // Only try to switch to the editor once
                showPage("editor");
                showedEditor = true;
            }
            sendURLtoFlash(pair[1]);
        }
    }
}


/* Modals */

function getOrCreateFromTemplate(elementId, templateId, elementType, appendTo, wrapper) {
    elementType = elementType ? elementType : "div";
    var $element = $("#" + elementId);
    if (!$element.length) {
        $template = $("#" + templateId);
        $element = $("<"+elementType+"></"+elementType+">")
            .attr("id", elementId)
            .html($template.html());
        if (wrapper) $element.wrapInner(wrapper);
        $element.appendTo(appendTo)
    }
    return $element;
};

function enableOverlay(forZIndex) {
    var overlayId = "modal-overlay";
    var $overlay = $("#" + overlayId);
    if (!$overlay.length) {
        $overlay = $("<div></div>")
            .attr("id", overlayId)
            .appendTo("body")
            .click(function(){
                $(this).trigger("modal:exit");
            });
    }
    $overlay.css({
        position: "fixed",
        display: "block",
        "z-index": forZIndex - 1,
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        opacity: "0.8",
        background: "black"
    });
    return $overlay;
}

function showModal(templateId) {
    /*
     * Copies the HTML referenced by data-template into a new element,
     * with id="modal-[template value]" and creates an overlay on the
     * page, which when clicked will close the popup.
     */

    var zIndex = 100;
    var modalId = "modal-" + templateId;
    $modalwrapper = $("<div class='modal-fade-screen'><div class='modal-inner'></div></div>");
    var $modal = getOrCreateFromTemplate(modalId, templateId, "dialog", "body", $modalwrapper);
    $modal.addClass("modal");
    $(".modal-fade-screen", $modal)
        .addClass("visible")
        .click(function(e){$(this).trigger("modal:exit")});
    $(".modal-inner", $modal).click(function(e){e.stopPropagation();})
    $("body").addClass("modal-open");
    $(document).on("modal:exit", function(){
        $("body").removeClass("modal-open");
        $(".modal-fade-screen", $modal).removeClass("visible");
        $(this).off();
    });
}

$("[data-action='modal']").click(function(e){
    /*
     * Usage:
     *     <a href="#content" data-action="modal" data-template="id-for-content">Popup</a>
     */

    e.preventDefault();
    showModal($(this).data("template"));
});


/* Page switching */

$("[data-action='static-link']").click(function(e) {
    /*
     * Links with data-action="static-link" should switch the view
     * to that page. Works like tabs sort of. Use like...
     *     <!-- Makes a link to the Privacy Policy section -->
     *     <a href="#privacy-policy" data-action="static-link">Privacy Policy</a>
     * 
     */
    var path = $(this).attr("href").substring(1);
    showPage(path);
});

function showPage(path) {
    /*
     * Show a part of the page.  The site is set up like
     * body
     *   main
     *     article#home
     *     article#privacy-policy
     *     ...
     *   editor
     * 
     * Each <article> is a "page" of the site, plus one special
     * view, which is the editor.
     * 
     * The editor is not actually hidden, but located -9999px above
     * the viewport. This is because if it's hidden, it doesn't load
     * when the page is loaded.
     *
     * So first we have to hide everything that we're not going to show
     * or move the editor up, then display everything we're going to show
     * if it's hidden.
     *
     * If we are linking to an anchor within a page, then show its parent.
     */
    var toHide = "body > main, body > main > article";
    var toShow = "#" + path;
    var $toShow = $(toShow);

    if (!$toShow.length) return;

    $(toHide).filter(":visible").hide();
    if (toShow != "#editor") $("#editor").css({top: "-9999px"});
    $("body > main, body > main > article").has($toShow).show();
    $toShow.show();
    if (path == "editor") {
        $toShow.css({top: 0});
    }
}

var initialID = "home";
function initPage() {
    /*
     * On load, show the page identified by the URL fragment. Default to #home.
     */
    if (window.location.hash) initialID = window.location.hash.substr(1);
    showPage(initialID);
    loadFromURLParameter();
}
$(initPage);
