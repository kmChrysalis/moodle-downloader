//popup.js
	let resourcesList = [], filesCounter = 0, resourceSelector, feedbackPrompt, feedbackDiv, buttonsDiv, warning, button;
//onload popup listener
	document.addEventListener("DOMContentLoaded",
		function() {
			resourceSelector = document.getElementById("resourceSelector");
			feedbackPrompt = document.getElementById("feedbackPrompt");
			button = document.getElementById("downloadResources");
			feedbackDiv = document.getElementById("feedbackDiv");
			buttonsDiv = document.getElementById("buttons");
			warning = document.getElementById("warning");
			//Button listened sending request to download files to a background script
			document.getElementById("downloadResources").addEventListener("click", downloadFromSelected);
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
			//Set buttons nah and sure
			document.getElementById("nah").addEventListener(
				"click", () => {
					buttonsDiv.classList.toggle("closed"); //close buttons
					feedbackPrompt.innerHTML = "No problem, you have a good one! 😄";
					setTimeout(() => {
						feedbackDiv.classList.toggle("closed"); //close feedback bar
					}, 2000);
				});
			document.getElementById("sure").addEventListener(
				"click", () => {
					buttonsDiv.classList.toggle("closed"); //close buttons
					feedbackPrompt.innerHTML = "Thanks so much 💝";
					setTimeout(() => {
						feedbackDiv.classList.toggle("closed"); //close feedback bar
						chrome.tabs.create({
							url: "https://chrome.google.com/webstore/detail/moodle-downloader/egdgajocnmpjhghpglffhngdojcinkhn"
						});
					}, 2000);
				});
			//Sending message to background to get a files
			chrome.runtime.sendMessage({message: "allFiles request"},
				function (response) {
					console.log(response);
					if (response.message === "files") {
						resourcesList = response.files;
						appendOptionsList()
					}
				});
			chrome.runtime.onMessage.addListener(
				response => response.message === "done"
					? requestFeedback(warning, button)
					: console.log(response));
		});
//Set selector options
	function appendOptionsList() {
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
		const button = document.getElementById("downloadResources");
		const warning = document.getElementById("warning");
		const resourceSelector = document.getElementById("resourceSelector");
		const selectedOptions = Array.from(resourceSelector.selectedOptions);
		// hiding the button and showing warning text
		button.setAttribute("hidden", "hidden");
		warning.removeAttribute("hidden");

		let selectedFilesList = [];

		selectedOptions.map(option => {
			const resourceIndex = Number(option.value);
			const resource = resourcesList[resourceIndex];
			selectedFilesList.push(resource);
		});
		filesCounter = selectedFilesList.length;
		chrome.runtime.sendMessage(
			{ message: "Download Selected", selected: selectedFilesList },
			response => console.log(response));
	}
//requesting feedback in body of popup
	function requestFeedback(warning, button) {
		// showing the button and removing the text and requesting for feedback
		warning.setAttribute("hidden", "hidden");
		button.removeAttribute("hidden");
		feedbackPrompt.innerHTML = filesCounter > 1
			? "You just downloaded " + filesCounter + " files using this tool! 🎉<br/><br/>"
			+ "I have spent more than <b>30 hours</b> to learn & develop this extension, could you please rate my efforts? 😬"
			: "You just downloaded " + filesCounter + " file using this tool! 🎉<br/><br/>"
			+ "Try select more and get'em all at once!<br>Hint: You may press ctrl+A";
		feedbackDiv.classList.toggle(`closed`);
		buttonsDiv.classList.toggle(`closed`);
	}