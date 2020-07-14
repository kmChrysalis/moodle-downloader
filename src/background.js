//background.js
    let resourcesList = [];
//Message manager
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            switch (request.message) {
                case "Download Section":
                    downloadResources(request.array, 0, "page");
                    sendResponse({ message: "Download section execute" });
                    break;
                case "Download Selected":
                    downloadResources(request.selected, 0, "popup");
                    sendResponse({ message: "Download selected execute" });
                    break;
                case "All Files":
                    resourcesList = request.files;
                    sendResponse({ message: "All files received" });
                    break;
                case "allFiles request":
                    sendResponse({ message: "All files sent", files: resourcesList });
                    break;
                default:
                    sendResponse({ message:  "Invalid request" });
            }
        });

//Download files from array received
    function downloadResources(resourcesArr, index, receiver) {
        let blob;
        let blobUrl;
        let newOptions = {
            url: "",
            conflictAction: "overwrite"
        }
        if (resourcesArr[index].type === "URL") {
            // We need to get the URL of the redirect and create a blob for it.
            fetch(resourcesArr[index].downloadOptions.url, { method: "HEAD" })
                .then(req => {
                        blob = new Blob(
                            [`[InternetShortcut]\nURL=${req.url}\n`],
                            {type: "text/plain"}
                        );
                        blobUrl = URL.createObjectURL(blob);
                        newOptions.url = blobUrl;
                        resourcesArr[index].downloadOptions = newOptions;
                    }
                );
        } else if (resourcesArr[index].type === "Page") {
            fetch(resourcesArr[index].downloadOptions.url)
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
                    resourcesArr[index].downloadOptions = newOptions;
                });
        } else newOptions.url = resourcesArr[index].downloadOptions.url;
        chrome.downloads.download(newOptions,
            () => {
                index < resourcesArr.length - 1
                    ? downloadResources(resourcesArr, ++index, receiver)
                    : receiver === "popup"
                    ? chrome.runtime.sendMessage({ message: "done", to: receiver })
                    : chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
                        chrome.tabs.sendMessage(tabs[0].id, { message: "done", to: receiver },
                            function(response) {
                            console.log(response);
                        });
                    });
            });
    }

//filename listener
    chrome.downloads.onDeterminingFilename.addListener(function (downloadItem, suggest) {
        const item = resourcesList.filter(r => r.downloadOptions.url === downloadItem.url)[0];
        let sanitisedItemName = sanitiseFilename(item.name) + '.' + downloadItem.filename.split('.')[1];
        if (item.type === "URL") {
            // The filename should be some arbitrary Blob UUID.
            // We should always replace it with the item's name.
            sanitisedItemName += ".url";
        } else if (item.type === "Page") {
            sanitisedItemName += ".html";
        }
        let filename = sanitiseFilename(item.course) +
            "/" +
            sanitiseFilename(item.section) +
            "/" +
            sanitisedItemName;
        suggest({filename: filename, conflictAction: "overwrite"});
    });
//clear file names to be displayed
    function sanitiseFilename(filename) {
        return filename.replace(/[\\/:*?"<>|]/g, " ").trim();
    }