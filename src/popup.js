//popup.js
	let resourcesList = [];
	let filesCounter = 0;
	/*let isDownloadActive = false;*/
//onload popup listener
	document.addEventListener("DOMContentLoaded",
		function() {
		const button = document.getElementById("downloadResources");
		//Button listened sending request to download files to a background script
		button.addEventListener(
			"click",
			function() {
				downloadFromSelected();
		});
		//Set some links and a search feature
		document.getElementById("telegram").addEventListener("click", () => {
			chrome.tabs.create({
				url: "https://t.me/chrysal1s"
			});
		});
		document.getElementById("github").addEventListener("click", () => {
			chrome.tabs.create({
				url: "https://github.com/kmChrysalis/moodle-downloader"
			});
		});
		document.getElementById("search").addEventListener("input", () => {
			filterOptions();
		});
		//Sending message to background to get a files
		chrome.runtime.sendMessage({
				name: "allFiles request"
			},
			function (response) {
				console.log(response);
				if(response.name === "files") {
					resourcesList = response.files;
					selectorOptions()
				}
			});
	});
//Set selector options
	function selectorOptions() {
		try {
			const resourceSelector = document.getElementById(
				"resourceSelector"
			);
			resourcesList.forEach((resource, index) => {
				const resourceOption = document.createElement("option");
				// creating option element such that the text will be
				// the resource name and the option value its index in the array.
				resourceOption.value = index.toString();
				resourceOption.title = resource.name;
				resourceOption.innerHTML = resource.name;
				resourceSelector.appendChild(resourceOption);
			});
		} catch (error) {
			console.log(error);
		}
	}
//search bar feature
	function filterOptions() {
		const searchField = document.getElementById("search");
		const query = searchField.value.toLowerCase();
		const regex = new RegExp(query, "i");
		const options = document.getElementById("resourceSelector").options;

		resourcesList.forEach((resource, index) => {
			resource.name.match(regex)
				? options[index].removeAttribute("hidden")
				: options[index].setAttribute("hidden", "hidden");
		});
	}
//get selected items from list and download'em
	function downloadFromSelected() {
		const INTERVAL = 500;
		const button = document.getElementById("downloadResources");
		const warning = document.getElementById("warning");
		const resourceSelector = document.getElementById("resourceSelector");
		const selectedOptions = Array.from(resourceSelector.selectedOptions);

		// hiding the button and showing warning text
		button.setAttribute("hidden", "hidden");
		warning.removeAttribute("hidden");

		// showing the button and removing the text and requesting for feedback
		setTimeout(() => {
			warning.setAttribute("hidden", "hidden");
			button.removeAttribute("hidden");
		}, (selectedOptions.length + 4) * INTERVAL);

		let selectedFilesList = [];

		selectedOptions.map((option, index) => {
			const resourceIndex = Number(option.value);
			const resource = resourcesList[resourceIndex];
			selectedFilesList.push(resource);
		});
		filesCounter += selectedFilesList.length;
		chrome.runtime.sendMessage(
			{
				name: "Download Selected",
				selected: selectedFilesList
			},
			function (response) {
				console.log(response);
			});

		requestFeedback();
	}
//requesting feedback in body of popup
	function requestFeedback() {
		if (filesCounter > 1) {
			const nah = document.getElementById("nah");
			nah.removeAttribute("hidden");

			const sure = document.getElementById("sure");
			sure.removeAttribute("hidden")

			const feedbackPrompt = document.getElementById("feedbackPrompt");
			feedbackPrompt.innerHTML =
				"You just downloaded " + filesCounter + " files using this tool! 🎉 <br/><br/>" +
				"I have spent more than <b>30 hours</b> to learn & develop this extension, could you please rate my efforts? 😬";

			const feedbackDiv = document.getElementById("feedbackDiv");
			feedbackDiv.setAttribute("style", "display: block");

			nah.addEventListener("click", () => {
				buttonEvent("No problem, you have a good one! 😄");
				setTimeout(() => {
					feedbackDiv.setAttribute("style", "display: none");
				}, 2000);
			});

			sure.addEventListener("click", () => {
				buttonEvent("Thanks so much 💝");
				setTimeout(() => {
					feedbackDiv.setAttribute("style", "display: none");
					chrome.tabs.create({
						url: "https://chrome.google.com/webstore/detail/moodle-downloader/egdgajocnmpjhghpglffhngdojcinkhn"
					});
				}, 2000);
			});

			function buttonEvent(string) {
				nah.setAttribute("hidden", "hidden");
				sure.setAttribute("hidden", "hidden");
				feedbackPrompt.innerHTML = string;
			}
		}
	}

