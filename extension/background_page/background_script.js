var config = new Config();
var store;
config.loadConfiguration(function () {
	console.log("initial configuration", config);
	store = new Store(config);
});

chrome.storage.onChanged.addListener(function () {
	config.loadConfiguration(function () {
		console.log("configuration changed", config);
		store = new Store(config);
	});
});

var sendToActiveTab = function(request, callback) {
	chrome.tabs.query({
		active: true,
		currentWindow: true
	}, function (tabs) {
		if (tabs.length < 1) {
			this.console.log("couldn't find active tab");
		}
		else {
			var tab = tabs[0];
			chrome.tabs.sendMessage(tab.id, request, callback);
		}
	});
};

chrome.runtime.onMessage.addListener(
	function (request, sender, sendResponse) {

		console.log("chrome.runtime.onMessage", request);

		if (request.createSitemap) {
			store.createSitemap(request.sitemap, sendResponse);
			return true;
		}
		else if (request.saveSitemap) {
			store.saveSitemap(request.sitemap, sendResponse);
			return true;
		}
		else if (request.deleteSitemap) {
			store.deleteSitemap(request.sitemap, sendResponse);
			return true;
		}
		else if (request.getAllSitemaps) {
			store.getAllSitemaps(sendResponse);
			return true;
		}
		else if (request.sitemapExists) {
			store.sitemapExists(request.sitemapId, sendResponse);
			return true;
		}
		else if (request.getSitemapData) {
			store.getSitemapData(new Sitemap(request.sitemap), sendResponse);
			return true;
		}
		else if (request.scrapeSitemap) {
            store = new Store(config);
			var sitemap = new Sitemap(request.sitemap);
			var queue = new Queue();
			var browser = new ChromePopupBrowser({
				pageLoadDelay: request.pageLoadDelay
			});

            browser.onCLose(() => {

                if(!request.fromRolli) return;

                store.getSitemapData(sitemap, function (data) {
                    var blob = sitemap.getDataExportCsvBlob(data);
                    
                    var message = {
                        downloadData: true,
                        blob: window.URL.createObjectURL(blob),
                        name: sitemap._id + ".csv"
                    };
    
                    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
                          console.log(response.farewell);
                        });
                    });
                }.bind(this));
            });

			var scraper = new Scraper({
				queue: queue,
				sitemap: sitemap,
				browser: browser,
				store: store,
				requestInterval: request.requestInterval
			});

			try {
				scraper.run(function () {
					var notification = chrome.notifications.create("scraping-finished", {
						type: 'basic',
						iconUrl: 'assets/images/icon128.png',
						title: 'Scraping finished!',
						message: 'Finished scraping ' + sitemap._id
					}, function(id) {
						// notification showed
					});
                    store.getSitemapData(sitemap, function (data) {
                        var blob = sitemap.getDataExportCsvBlob(data);
                        var a = document.createElement("a");
                        document.body.appendChild(a);
                        a.style = "display: none";
                        var url = window.URL.createObjectURL(blob);
                        a.href = url;
                        a.download = sitemap._id + ".csv";
                        a.click();
                        window.URL.revokeObjectURL(url);
                    }.bind(this));
					sendResponse();
				});
			}
			catch (e) {
				console.log("Scraper execution cancelled".e);
                store.getSitemapData(sitemap, function (data) {
                    var blob = sitemap.getDataExportCsvBlob(data);
                    $(".download-button a").attr("href", window.URL.createObjectURL(blob));
                    $(".download-button a").attr("download", sitemap._id + ".csv");
                    $(".download-button").show();
                }.bind(this));
			}

			return true;
		}
		else if(request.previewSelectorData) {
			chrome.tabs.query({
				active: true,
				currentWindow: true
			}, function (tabs) {
				if (tabs.length < 1) {
					this.console.log("couldn't find active tab");
				}
				else {
					var tab = tabs[0];
					chrome.tabs.sendMessage(tab.id, request, sendResponse);
				}
			});
			return true;
		}
		else if(request.backgroundScriptCall) {

			var backgroundScript = getBackgroundScript("BackgroundScript");
			var deferredResponse = backgroundScript[request.fn](request.request)
			deferredResponse.done(function(response){
				sendResponse(response);
			});

			return true;
		}
	}
);
