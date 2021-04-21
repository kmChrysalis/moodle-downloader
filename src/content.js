//content.js
//a little beautify
document.querySelectorAll('div.cttoggle, a.cps_centre, .side').forEach(e => e.remove());
let sectionsMap = new Map();
let resourcesList = getFiles();

//setting buttons on a page by self-invoking method
function setButtons(sections) {
	const icon = chrome.runtime.getURL("assets/w_icon24.png");
	const warning = document.createElement("p");
	warning.innerText = "🧙 Please stay on page while magic happens   ";
	warning.setAttribute("style", "display: inline; color: #1177d1; font-weight: bold;");
	warning.setAttribute("class", "warning-ext");
	sectionsMap.forEach((sectionEl, sectionName) => {
		if (sections.includes(sectionName)) {
			if (sectionName === "General")
				sectionEl = document
					.querySelector('.content')
					.querySelector('.section');
			else {
				while (sectionEl.className !== "content")
					sectionEl = sectionEl.parentElement;
				sectionEl = sectionEl.lastChild.lastChild;
			}
			const button = document.createElement("button");
			button.setAttribute("style", "background: #1177d1 url(" + icon + ") no-repeat 6px 7px;");
			button.setAttribute("id", "dl-button");
			button.innerHTML = "[" + sectionName + "]";
			button.addEventListener("click", function () {
				const btn = this;
				btn.disabled = true;
				btn.parentElement.appendChild(warning);
				const sectionFilesList = resourcesList.filter(res => res.section === sectionName);
				chrome.runtime.sendMessage({message: "Download Section", array: sectionFilesList});
				chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
					btn.disabled = !(request.message === "done" && request.to === "page");
					button.parentElement.getElementsByTagName("p")[0].remove();
					sendResponse("Button enabled");
				});
			});

			const li = sectionEl.firstChild.cloneNode();
			li.appendChild(button)
			sectionEl.insertBefore(li, sectionEl.firstChild);
		}
		else if (sectionEl.className !== 'summary') {
			sectionEl.parentNode.parentNode.parentNode.remove();
		}
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
		.split(/[ ]{2,}/)[0]//name cleanup
	const sesskey = new URL(
		document.querySelector("a[href*='login/logout.php']").href
	).searchParams.get("sesskey");

	const tableBody = document.querySelector(
		"div[role='main'] > table.generaltable.mod_index > tbody"
	);
	const SUPPORTED_FILES = new RegExp("File|Folder|URL|Page|קובץ|תצוגת תיקיית קבצים|קישור לאתר אינטרנט|דף תוכן מעוצב", 'g');
	const allFiles = tableBody === null
		? getFilesUnderSections(sesskey, SUPPORTED_FILES, courseName).filter(x => x)
		: getFilesUnderResources(sesskey, tableBody, SUPPORTED_FILES, courseName).filter(x => x);
	chrome.runtime.sendMessage({
			message: "All Files",
			files: allFiles
		},
		(response) => console.log(response));
	setButtons(allFiles.map(file => file.section));
	return allFiles;
}

function getDownloadOptions(sesskey, url) {
	if (!url.includes("folder")) return {url: url + "&redirect=1"};
	const urlObj = new URL(url);
	const id = urlObj.searchParams.get("id");
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
			const sectionEl = content.querySelector(".sectionname") ||
				content.querySelector(".summary")
			const sectionName = sectionEl && sectionEl.textContent.length > 0  && sectionEl.textContent.length < 55 ?
				cleanupSection(sectionEl.textContent.trim()) : "General";
			if (!sectionEl) return;
			sectionsMap.set(sectionName, sectionEl);
			return Array.from(content.getElementsByClassName("activity"))
				.map(activity => ({
					instanceName: activity.getElementsByClassName("instancename")[0],
					anchorTag: activity.getElementsByTagName("a")[0]
				}))
				.filter(({instanceName, anchorTag}) => instanceName && anchorTag)
				.map(({instanceName, anchorTag}) => ({
					course: courseName,
					name: instanceName.firstChild.textContent.trim(),
					downloadOptions: getDownloadOptions(sesskey, anchorTag.href),
					type: instanceName.lastChild.textContent.trim(),
					section: sectionName
				}))
				.filter(activity => activity.type.match(SUPPORTED_FILES))
				// .forEach(item => console.log(item));
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
		.filter(resource => resource.type.match(SUPPORTED_FILES));
}

function cleanupSection(name) {
	return name.replace(' - הקליקו', '')
		.replace('Toggle - ', '')
		.replace(/[^\-0-9a-zA-Z\u0590-\u05FF\uFB2A-\uFB4E ]/g, "")
		.split(/[ ]{2,}/)[0];
}