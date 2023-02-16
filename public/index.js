//Global Variable Definitions
var socket;
var pageData = [];
var nextAutoNumber = 0;
var hasUnsavedChanges = false;
var log = "";
var logLines = 0;
var config = {};

/**
 * Writes a line (or lines) of text to the 'Automatic Tools Log' on the page. Will automatically replace
 * newlines, returns, and carraige returns with <br> tags. Each call to this function will create its own
 * div.log-entry, which is what puts each entry on a new 'line'.
 * 
 * @param {String} msg The message to write to the log
 */
function writeLog(msg) {
    var htmlMsg = msg.replace(/(?:\r\n|\r|\n)/g, '<br>');
    log += "<div class='log-entry' id='log-line-" + logLines + "'>" + htmlMsg + "</div>";
    $("#log").html(log);
    logLines++;
}

/**
 * Copies the text of the indicated element to the clipboard. Uses jQuery's .text()
 * method. DOES NOT CHECK FOR INVALID INPUTS.
 * 
 * @param {String} elemId The ID of the element containing the text to be copied
 */
function copyText(elemId) {
    navigator.clipboard.writeText($("#" + elemId).text());
}

function copyButton(rowId) {
    var text = $("div#" + rowId + " span.copyable").text();
    navigator.clipboard.writeText(text);
    $("div#" + rowId + " div.copy-btn").addClass("clicked");
}

/**
 * Used to indicate changes have been made to the file that only exist in the user's browser.
 * Namely, makes the save button turn red and makes the save reminder appear. These will be changed
 * back if/when the user does save their changes.
 */
function markUnsavedChanges() {
    hasUnsavedChanges = true;
    $("#save-changes").addClass('unsaved');
    $("#save-reminder").css('display', 'block');
}

/**
 * Uses the global pageData variable to build out all the data in the table that was received
 * from the server. Can be called again at any time to refresh the user's view if needed.
 */
function buildDataToPage() {
    var output = "";
    pageData.forEach((row, index) => {
        const parsedNumber = parseInt(row[0]);
        if(!isNaN(parsedNumber) && parsedNumber >= nextAutoNumber) {
            nextAutoNumber = parsedNumber + 1;
        }

        output += "<tr><td>" + row[0] + "</td><td>" + row[1] + "</td></tr>";
    });

    $("#data").html(output);
}

/**
 * Looks through each 'row' of data in the pageData global variable and automatically
 * generates ID numbers for any rows that are missing them.
 * 
 * NOTE: Uses the nextAutoNumber global variable which is automatically found during the
 * buildDataToPage() function, so it should be run at least once before this is called.
 */
function generateNumbers() {
    var numGenerated = 0;

    pageData.forEach((row, index, data) => {
        if(row[0] == "") {
            data[index][0] = "" + nextAutoNumber;
            writeLog("<input style='margin-left: 0.5em' type='checkbox' /><div class='copy-btn' onclick='copyButton(\"log-line-" + logLines + "\");'><span class='material-symbols-outlined'>content_copy</span></div> Set " + config.ID_NAME + " for '" +
                    data[index][1] + "' to <span style='margin-left: 0.5em' class='copyable'>" + data[index][0] + "</span>");
            nextAutoNumber++;
            numGenerated++;
        }
    });

    buildDataToPage();
    writeLog("Finished auto-generating a total of " + numGenerated + " missing " + config.ID_NAME + "s. Checkboxes and buttons to copy the IDs are included to help with entering these into the system.");
    if(numGenerated > 0) markUnsavedChanges();
}

$(document).ready(function () {
    socket = io();

    socket.on('pull_config_resp', function(config_in) {
        config = config_in;
        socket.emit('pull_data', true);
    });

    socket.on('pull_data_resp', function(data_in) {
        pageData = data_in;
        buildDataToPage();
    });

    socket.on('save_changes_resp', function(successful) {
        if(successful) {
            hasUnsavedChanges = false;
            $("#save-changes").removeClass('unsaved');
            $("#save-reminder").css('display', 'none');
        }
    });

    socket.emit('pull_config', true);

    $("#fill-numbers").on('click', function() {
        generateNumbers();
    });

    $("#save-changes").on('click', function() {
        socket.emit('save_changes', pageData);
    });
});