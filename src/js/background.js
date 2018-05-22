'use strict';

// Extension entry point

// OVERVIEW:
// 1) Declarative content checks if on the correct page, and activates popup if so.
// 2) Set up listeners:
// 2) a) From contentScript, when it sent metadata about available lectures.
//       Clear previous entry and save current lectures metadata to extension local
//       storage, so popup can access these data.
// 2) b) From popup, when it sent list of data of lectures to download.
//       Download is initiated and chained, so only 1 item downloads at a time.

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
chrome.runtime.onMessage.addListener((msgIn, callback) => {
    const msgInObj = JSON.parse(msgIn);
    // discard message if not directed to background
    if (msgInObj.to !== 'background') {
        return;
    }
    // Message from contentScript when it fetched video data
    // Data is saved to local extension storage so popup script can access the data
    if (msgInObj.from === 'contentScript' && msgInObj.status === 'success') {
        chrome.storage.local.clear((e) => {
            if (e) {
                throw Error(e);
            }
            // Check if received message does not contain lecture data
            if (!msgInObj.payload || (msgInObj.payload.dataArr.length == 0)) {
                throw Error('Received message does not contain any lecture data but message indicated so.');
            }
            chrome.storage.local.set({
                videos: msgInObj.payload.dataArr
            });
        });
    }
    // Messages from contentScript when it did not get any videos
    else if (msgInObj.from === 'contentScript' && msgInObj.status !== 'success') {
        throw Error('Content script failed to obtain any lecture data from the page.');
    }
    // Messages from popup to start video download
    else if (msgInObj.from === 'popup' && msgInObj.status === 'success') {
        // For each download query, set up a promise and chain them together so that
        // each new file starts download only once the previous one is done.
        msgInObj.payload.downloadQueryList.reduce((promise, downloadQuery) => {
            let triggerDownload = () => {
                return new Promise((resolve, reject) => {
                    chrome.downloads.download(downloadQuery, (id) => {
                        chrome.downloads.onChanged.addListener((delta) => {
                            if (delta.id === id && delta.state && delta.state.current === 'complete') {
                                resolve();
                            }
                        });
                    });
                });
            }
            return promise.then(triggerDownload);
        }, Promise.resolve());
    }
    // Messages from contentScript when it send download request but without any data
    else if (msgInObj.from === 'popup' && msgInObj.status !== 'success') {
        throw Error('Popup script tried to request download with no payload.');
        return;
    }
});