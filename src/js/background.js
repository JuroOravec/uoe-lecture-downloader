'use strict';

// Extension entry point

// Active only if host: 'echo360.org.uk' AND protocol: 'https'
// AND (either <video> OR .class-row[role="link"] found in DOM)
chrome.runtime.onInstalled.addListener(function () {
    const protocol = 'https';
    const host = 'echo360.org.uk';
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        var rule1 = {
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        hostEquals: host,
                        schemes: [protocol]
                    },
                    css: ['video']
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        };
        var rule2 = {
            conditions: [
                new chrome.declarativeContent.PageStateMatcher({
                    pageUrl: {
                        hostEquals: host,
                        schemes: [protocol]
                    },
                    css: ['.class-row[role="link"]']
                })
            ],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        };
        chrome.declarativeContent.onPageChanged.addRules([
            rule1,
            rule2
        ]);
    });
});
// Listener waiting for messages 
chrome.runtime.onMessage.addListener(function (msgIn, callback) {
    const msgInJSON = JSON.parse(msgIn);
    // discard message if not directed to background
    if (msgInJSON.to !== 'background') {
        return;
    }
    // Message from videoSrcFetcher when it fetched video data
    //  -> save data to local so popup script can access it anytime
    if (msgInJSON.from === 'videoSrcFetcher' && msgInJSON.status === 'success') {
        chrome.storage.local.clear(function (e) {
            if (e) {
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                return;
            }
            // check if valid message
            if (!msgInJSON.payload || (msgInJSON.payload.videoList.length == 0)) {
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                return;
            }
            chrome.storage.local.set({
                videos: msgInJSON.payload.videoList
            });
        });
    }
    // Messages from videoSrcFetcher when it did not get any videos
    else if (msgInJSON.from === 'videoSrcFetcher' && msgInJSON.status == 'fail') {
        // TO DO ERROR HANDLING IN VIDEOFETCHER AND SHOW A MESSAGE IN POPUP THAT NO VIDEOS WERE FOUND
        // TO DO ERROR HANDLING IN VIDEOFETCHER AND SHOW A MESSAGE IN POPUP THAT NO VIDEOS WERE FOUND
        // TO DO ERROR HANDLING IN VIDEOFETCHER AND SHOW A MESSAGE IN POPUP THAT NO VIDEOS WERE FOUND
        // TO DO ERROR HANDLING IN VIDEOFETCHER AND SHOW A MESSAGE IN POPUP THAT NO VIDEOS WERE FOUND
        // TO DO ERROR HANDLING IN VIDEOFETCHER AND SHOW A MESSAGE IN POPUP THAT NO VIDEOS WERE FOUND
        // TO DO ERROR HANDLING IN VIDEOFETCHER AND SHOW A MESSAGE IN POPUP THAT NO VIDEOS WERE FOUND
        return;
    }
    // Messages from popup to start video download
    else if (msgInJSON.from === 'popup' && msgInJSON.status === 'success') {
        msgInJSON.payload.downloadQueryList.forEach((downloadQuery) => {
            chrome.downloads.download(downloadQuery, () => {
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
                // TO DO ERROR HANDLING
            });
        });
    } else if (msgInJSON.from === 'popup' && msgInJSON.status === 'fail') {
        // TO DO ADD ERROR HANDLING TO SEND FAIL STATUS
        // TO DO ADD ERROR HANDLING TO SEND FAIL STATUS
        // TO DO ADD ERROR HANDLING TO SEND FAIL STATUS
        // TO DO ADD ERROR HANDLING TO SEND FAIL STATUS
        // TO DO ADD ERROR HANDLING TO SEND FAIL STATUS
        // TO DO ADD ERROR HANDLING TO SEND FAIL STATUS
        return;
    }
});