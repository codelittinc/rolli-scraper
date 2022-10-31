chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {

		console.log("chrome.runtime.onMessage", request);

		if (request.extractData) {
			console.log("received data extraction request", request);
			var extractor = new DataExtractor(request);
			var deferredData = extractor.getData();
			deferredData.done(function(data){
				console.log("dataextractor data", data);
				sendResponse(data);
			});
			return true;
		}
		else if(request.previewSelectorData) {
			console.log("received data-preview extraction request", request);
			var extractor = new DataExtractor(request);
			var deferredData = extractor.getSingleSelectorData(request.parentSelectorIds, request.selectorId);
			deferredData.done(function(data){
				console.log("dataextractor data", data);
				sendResponse(data);
			});
			return true;
		}
		// Universal ContentScript communication handler
		else if(request.contentScriptCall) {

			var contentScript = getContentScript("ContentScript");

			console.log("received ContentScript request", request);

			var deferredResponse = contentScript[request.fn](request.request);
			deferredResponse.done(function(response) {
				sendResponse(response);
			});

			return true;
		} else if(request.downloadData) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', request.blob, true);
            xhr.responseType = 'blob';
            xhr.onload = function(e) {
            if (this.status == 200) {
                var myBlob = this.response;
                console.log(myBlob);

                var a = document.createElement("a");
                document.body.appendChild(a);
                a.style = "display: none";
                var url = window.URL.createObjectURL(myBlob);
                a.href = url;
                a.download = request.name;
                a.click();
                window.URL.revokeObjectURL(url);
                // myBlob is now the blob that the object URL pointed to.
            }
            };
            xhr.send();
        }
	}
);

document.addEventListener("rolli-scraping", function(data) {
    console.log(data);

    let request = {
        scrapeSitemap: true,
        fromRolli: true,
        sitemap: structuredClone(data?.detail?.sitemap),
        requestInterval: 2000,
        pageLoadDelay: 500
    };

    chrome.runtime.sendMessage(request);
});