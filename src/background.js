//background.js
    const INTERVAL = 1000;
    let resourcesList = [];
//Message manager
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            switch (request.name) {
                case "Download Section":
                    downloadResources(request.array, sendResponse);
                    /*sendResponse("background.js saying: Resources under loading")*/
                    break;
                case "Download Selected":
                    downloadResources(request.selected, sendResponse);

                    break;
                case "All Files":
                    resourcesList = request.files;
                    sendResponse("background.js saying: Your files were saved by background.js");
                    break;
                case "allFiles request":
                    sendResponse({
                        name: "files",
                        files: resourcesList
                    });
                    break;
                default:
                    sendResponse("background.js saying: Invalid request");
            }
        });
//Download files from array received
    function downloadResources(arr, sendResponse) {
        arr.forEach((resource, index) => download(resource, index, sendResponse)); //call download
        sendResponse({message: "wait", time: arr.length * INTERVAL})
    }
//download a file by index
    function download(resource, index) {
        let blob;
        let blobUrl;
        let newOptions = {
            url: "",
            conflictAction: "overwrite"
        }
        if (resource.type === "URL") {
            // We need to get the URL of the redirect and create a blob for it.
            fetch(resource.downloadOptions.url, {method: "HEAD"}).then(
                req => {
                    blob = new Blob(
                        [`[InternetShortcut]\nURL=${req.url}\n`],
                        {type: "text/plain"}
                    );
                    blobUrl = URL.createObjectURL(blob);
                    newOptions.url = blobUrl;
                    resource.downloadOptions = newOptions;
                }
            );
        } else if (resource.type === "Page") {
            fetch(resource.downloadOptions.url)
                .then(req => {
                    return req.text();
                })
                .then(text => {
                    // We want to grab "[role='main']" from the text and save that
                    // as an HTML file.
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(text, "text/html");
                    const toSave = doc.querySelector("[role='main']").outerHTML;
                    blob = new Blob([toSave], {type: "text/html"});
                    blobUrl = URL.createObjectURL(blob);
                    newOptions.url = blobUrl;
                    resource.downloadOptions = newOptions;
                });
        } else {
            newOptions.url = resource.downloadOptions.url;
        }
        setTimeout(() => {
            chrome.downloads.download(newOptions);
        }, index * INTERVAL);

    }
//downloading listener
//TODO Rewrite or not download already existing files
    chrome.downloads.onDeterminingFilename.addListener( //suggestFileName
    function(downloadItem, suggest) {
        const item = resourcesList.filter(r => r.downloadOptions.url === downloadItem.url)[0];
        let filename = downloadItem.filename;
        const sanitisedItemName = sanitiseFilename(item.name);

        if (item.type === "URL") {
            // The filename should be some arbitrary Blob UUID.
            // We should always replace it with the item's name.
            filename = sanitisedItemName + ".url";
        } else if (item.type === "Page") {
            filename = sanitisedItemName + ".html";
        }
        filename = sanitiseFilename(item.course) +
            "/" +
            (item.section && sanitiseFilename(item.section) + "/") +
            filename;
        suggest({filename: filename, conflictAction: "overwrite"});
    });
//clear file names to be displayed
    function sanitiseFilename(filename) {
    return filename.replace(/[\\/:*?"<>|]/g, " ");
}
//initializing user storage
