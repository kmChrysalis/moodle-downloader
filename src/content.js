//content.js
document.querySelectorAll('div.cttoggle, a.cps_centre, .side').forEach(e => e.remove());
	let sectionsMap = new Map();
    let resourcesList = getFiles();

//setting buttons on a page by self-invoking method
    function setButtons() {
		let icon = chrome.runtime.getURL("assets/w_icon24.png");
		let warning = document.createElement("p");
		warning.innerText = "🧙 Please stay on page while magic happens   ";
		warning.setAttribute("style", "display: inline; color: #1177d1; font-weight: bold;");
		warning.setAttribute("class", "warning-ext");
		sectionsMap.forEach((sectionEl, sectionName) => {
			if (sectionName === "General")
				sectionEl = document.querySelector('.content').querySelector('.section');
			else {
				while(sectionEl.className !== "content") sectionEl = sectionEl.parentElement;
				sectionEl = sectionEl.lastChild.lastChild;
				if (sectionEl.childNodes.length === 0) {
					sectionEl.parentNode.parentNode.parentNode.remove();
					return;
				}
			}
			//lets create button
			let button = document.createElement("button"); //<button type="button"
			button.setAttribute("style", "background: #1177d1 url(" + icon + ") no-repeat 6px 7px;");
			button.setAttribute("id", "dl-button");
			button.innerHTML = "[" + sectionName+ "]"; //Section Download</button>
			button.addEventListener("click", function () {
				let btn = this;
				btn.disabled = true;
				btn.parentElement.appendChild(warning);
				let sectionFilesList = resourcesList.filter(res => res.section === sectionName);
				chrome.runtime.sendMessage({message: "Download Section", array: sectionFilesList});
				chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
					btn.disabled = !(request.message === "done" && request.to === "page");
					button.parentElement.getElementsByTagName("p")[0].remove();
					sendResponse("Button enabled");
				});
			});

			let li = sectionEl.firstChild.cloneNode(); //<ul> => <li...>
			li.appendChild(button) //<li> => <button>
			sectionEl.insertBefore(li, sectionEl.firstChild); //insert before first element in <ul>
		});
	}
//getting files to all files list
    function getFiles() {
		let courseName = //set course name
			document.getElementsByClassName("breadcrumb-item")[2].textContent.trim() || //try to get course name
			document.getElementsByTagName("h1")[0].innerText || //if no course name, get probably university name
			document.querySelector("header#page-header .header-title").textContent.trim() ||
			"";
		courseName = courseName.replace(/[^a-zA-Z\u0590-\u05FF\uFB2A-\uFB4E ]/g, "")
			.replace(/[ ]{2,}/, "") //name cleanup
		// The session key should normally be accessible through window.M.cfg.sesskey,
		// but getting the window object is hard.
		// Instead, we can grab the session key from the logout button.
		// Note that var is used here as this script can be executed multiple times.
		const sesskey = new URL(
			document.querySelector("a[href*='login/logout.php']").href
		).searchParams.get("sesskey");

		const tableBody = document.querySelector(
			"div[role='main'] > table.generaltable.mod_index > tbody"
		);
		const SUPPORTED_FILES = new Set(["File", "Folder", "URL", "Page", "קובץ", "תצוגת תיקיית קבצים", "קישור לאתר אינטרנט", "דף תוכן מעוצב"]);
		const allFiles = tableBody === null
			? getFilesUnderSections(sesskey, SUPPORTED_FILES, courseName).filter(x => x)
			: getFilesUnderResources(sesskey, tableBody, SUPPORTED_FILES, courseName).filter(x => x);
		chrome.runtime.sendMessage({
				message: "All Files",
				files: allFiles
			},
			function (response) {
				console.log(response);
			});
		setButtons();
		return allFiles;
	}

    function getDownloadOptions(sesskey, url) {
		if (!url.includes("folder")) {
			// Resources, URLs, Pages.
			// URLs and Pages need to be handled in popup.js.
			return {url: url + "&redirect=1"};
		}
		const urlObj = new URL(url);
		const id = urlObj.searchParams.get("id");
		// We will modify the downloadURL such that each folder has a
		// unique download URL (so suggestFilename will work).
		// Adding "?id=ID" to the POST URL still results in a valid
		// request, so we can use this to uniquely identify downloads.
		const downloadUrl =
			urlObj.origin +
			urlObj.pathname.slice(undefined, urlObj.pathname.lastIndexOf("/")) +
			"/download_folder.php?id=" +
			id;
		return {
			url: downloadUrl,
			method: "POST",
			headers: [
				{
					name: "content-type",
					value: "application/x-www-form-urlencoded"
				}
			],
			body: `id=${id}&sesskey=${sesskey}`
		};
	}

    function getFilesUnderSections(sesskey, SUPPORTED_FILES, courseName) {
		return Array.from(document.querySelectorAll('.content'))
			.map(content => {
				let sectionEl = content.querySelector(".sectionname");
				if (!sectionEl) sectionEl = content.querySelector(".summary");
				if (!sectionEl || sectionEl.textContent.length > 50) {
					sectionEl = document.createElement("div");
					sectionEl.textContent = "General";
				}
				if (sectionEl.childNodes.length === 0) return;
				const sectionName = cleanupSection(sectionEl.textContent.trim());
				sectionsMap.set(sectionName, sectionEl);
				return Array.from(content.getElementsByClassName("activity"))
					.map(activity => ({
						instanceName: activity.getElementsByClassName("instancename")[0],
						anchorTag: activity.getElementsByTagName("a")[0]
					}))
					.filter(({instanceName, anchorTag}) => instanceName !== undefined && anchorTag !== undefined)
					.map(({instanceName, anchorTag}) => ({
						course: courseName,
						name: instanceName.firstChild.textContent.trim(),
						downloadOptions: getDownloadOptions(sesskey, anchorTag.href),
						type: instanceName.lastChild.textContent.trim(),
						section: sectionName
					}))
					.filter(activity => SUPPORTED_FILES.has(activity.type));
			})
			.reduce((x, y) => x.concat(y), []);
	}

    function getFilesUnderResources(sesskey, tableBody, SUPPORTED_FILES, courseName) {
		return Array.from(tableBody.children) // to get files under Resources tab
			.filter(resource => resource.getElementsByTagName("img").length !== 0)
			.map(resource => {
					(resource = {
						courseName: courseName,
						name: resource.getElementsByTagName("a")[0].textContent.trim(),
						downloadOptions: getDownloadOptions(sesskey, resource.getElementsByTagName("a")[0].href),
						type: resource.getElementsByTagName("img")[0]["alt"].trim(),
						section: resource.getElementsByTagName("td")[0].textContent.trim()
					})
				}
			)
			.map((resource, index, array) => {
				resource.section =
					resource.section ||
					(array[index - 1] && array[index - 1].section) ||
					"";
				return resource;
			})
			.filter(resource => SUPPORTED_FILES.has(resource.type));
	}

    function cleanupSection(name) {
		return name.replace(' - הקליקו', '').replace('Toggle - ', '');
	}