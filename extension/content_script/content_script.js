chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {

		console.log("chrome.runtime.onMessage", request);

		if (request.extractData) {
			console.log("received data extraction request", request);
			var extractor = new DataExtractor(request);
			var deferredData = extractor.getData();
			deferredData.done(function(data){
				console.log("dataextractor data", data);
                data[0]['org_id'] = String(request.sitemap.org_id)
                data[0]['org_name'] = String(request.sitemap.org_name)
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
    let request = {
        scrapeSitemap: true,
        fromRolli: true,
        sitemap: structuredClone(data?.detail?.sitemap),
        requestInterval: 1000,
        pageLoadDelay: 500
    };

    request.sitemap['org_id'] = data?.detail?.org_id
    request.sitemap['org_name'] = data?.detail?.org_name

    chrome.runtime.sendMessage(request);
});