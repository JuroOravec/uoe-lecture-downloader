'use strict';

import z from "./video-fetcher";


console.log("hello from index.js");



chrome.runtime.onInstalled.addListener(function () {
    chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
        chrome.declarativeContent.onPageChanged.addRules([{
            conditions: [new chrome.declarativeContent.PageStateMatcher({
                pageUrl: {
                    hostEquals: 'developer.chrome.com'
                },
            })],
            actions: [new chrome.declarativeContent.ShowPageAction()]
        }]);
    });
});

// chrome.runtime.onInstalled.addListener(function () {
//     chrome.declarativeContent.onPageChanged.removeRules(undefined, function () {
//         chrome.declarativeContent.onPageChanged.addRules([{
//             conditions: [new chrome.declarativeContent.PageStateMatcher({
//                 pageUrl: {
//                     hostEquals: 'echo360.org.uk'
//                 },
//             })],
//             actions: [
//                 new chrome.declarativeContent.ShowPageAction(),
//                 function () {
//                     console.log("your're on a right page!")
//                 }
//             ]
//         }]);
//     });
// });

console.log('resourcer: ');
// chrome.devtools.inspectedWindow.getResources(function (data) {
//     console.log(data)
// });