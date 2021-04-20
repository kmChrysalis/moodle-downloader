//background.js
    let resourcesList = [];

//Download files from array received
    function downloadResources(resourcesArr, index, receiver) {
		let blob;
		let blobUrl;
		let newOptions = {
			url: "",
			conflictAction: "overwrite",
		}
		if (resourcesArr.length > 0 && resourcesArr[index]) {
			if (resourcesArr[index].type === "URL") {
				// We need to get the URL of the redirect and create a blob for it.
				fetch(resourcesArr[index].downloadOptions.url, {method: "HEAD"})
					.then(req => {
						blob = new Blob(
							[`[InternetShortcut]\nURL=${req.url}\n`],
							{type: "text/plain"}
						);
						blobUrl = URL.createObjectURL(blob);
						newOptions.url = blobUrl;
						resourcesArr[index].downloadOptions = newOptions;
						downloadFromURL(resourcesArr, newOptions, index, receiver);
					});
			} else if (resourcesArr[index].type === "Page" || resourcesArr[index].type === "page") {
				fetch(resourcesArr[index].downloadOptions.url)
					.then(req => {
						return req.text();
					})
					.then(text => {
						// We want to grab "[role='main']" from the text and save that as an HTML file.
						const parser = new DOMParser();
						const doc = parser.parseFromString(text, "text/html");
						const toSave = doc.querySelector("[role='main']").outerHTML;
						blob = new Blob([toSave], {type: "text/html"});
						blobUrl = URL.createObjectURL(blob);
						newOptions.url = blobUrl;
						resourcesArr[index].downloadOptions = newOptions;
						downloadFromURL(resourcesArr, newOptions, index, receiver);
					});
			} else {
				newOptions.url = resourcesArr[index].downloadOptions.url;
				downloadFromURL(resourcesArr, newOptions, index, receiver);
			}
		}
		// else console.log("resourcesArr length = ", resourcesArr.length, `resourcesArr[${index}] = `, resourcesArr[index]);
	}

	function downloadFromURL(resourcesArr, newOptions, index, receiver) {
		chrome.downloads.download(newOptions,
			() => {
				index < resourcesArr.length - 1
					? downloadResources(resourcesArr, ++index, receiver)
					: receiver === "popup"
					? chrome.runtime.sendMessage({message: "done", to: receiver})
					: chrome.tabs.query({active: true, currentWindow: true}, function (tab) {
						if (tab) {
							chrome.tabs.sendMessage(tab[0].id,
								{message: "done", to: receiver},
								function (response) {
									console.log(response);
								});
						}
					});
			});
	}

//filename listener
    chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
		const item = resourcesList.filter(r => r.downloadOptions.url === downloadItem.url)[0];
		let sanitisedItemName;
		if (item) {
			if (item.name && downloadItem && downloadItem.filename) {
				sanitisedItemName = sanitiseFilename(item.name) + '.' + downloadItem.filename.split('.')[1];
			} else sanitisedItemName = downloadItem.filename;
			if (item.type === "URL") { // The filename should be some arbitrary Blob UUID.
				sanitisedItemName += ".url"; // We should always replace it with the item's name.
			} else if (item.type === "Page") {
				sanitisedItemName += ".html";
			}
			let filename = item.course ? item.course.length > 0 ? sanitiseFilename(item.course) + "/" : "no_course_name/" : "no_course_name/";
			filename += item.section ? item.section.length > 0 ? sanitiseFilename(item.section) + "/" : "" : "";
			filename += sanitisedItemName;
			suggest({filename: filename, conflictAction: "overwrite"});
		}

		//suggest({filename: this.filename, conflictAction: "overwrite"});
	});

//clear file names to be displayed
    function sanitiseFilename(filename) {
		return filename.replace(/[\\/:*?"<>|]+/g, " ").replace("  ", " ").trim();
	}

//Message manager
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	switch (request.message) {
		case "Download Section":
			downloadResources(request.array, 0, "page");
			sendResponse({message: "Download section execute"});
			break;
		case "Download Selected":
			downloadResources(request.selected, 0, "popup");
			sendResponse({message: "Download selected execute"});
			break;
		case "All Files":
			resourcesList = request.files;
			sendResponse({message: "All files received"});
			break;
		case "allFiles request":
			sendResponse({message: "All files sent", files: resourcesList});
			break;
		default:
			sendResponse({message: "Invalid request"});
	}
});