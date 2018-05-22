'use strict'

// Locates DOM elements, and obtain URL(s) of video(s) available for download.
// Runs after page loads. Assumes background has set up listeners

// OVERVIEW:
// 1) Decide if on single or menu page based on present DOM nodes
// 2) Decide if DOM nodes of interest present, set up observers and wait if not
// 3) a) If single page, get and process JSON from present scripts, extract data from that
// 3) b) If menu page, modify present links to API requests for metadata about present lectures
//       and extract data from those.
// 4) Send processed data to background.

let videoList = [];
let context;

// locate elements unique for single and menu pages
const singleElem = document.querySelector('body[aria-label="Content viewer"]'); // Unique to content viewer
const menuElem = document.querySelector('.courseHome'); // Unique to course menu

// Decide if on a video (single) or on menu 
if (singleElem) {
    context = 'single';
} else if (menuElem) {
    context = 'menu';
}
// Based on context, continue, or set up observers until relevant nodes appear.
// If on single, look for scripts already on page and get video metadata from them,
// to minimize XHR requests
if (context === 'single') {
    let scriptNodeList = document.querySelectorAll('script');
    // If no script nodes found, observe until script nodes are added to DOM
    if (scriptNodeList.length === 0) {
        let singlePageObserver = new MutationObserver((mutationsList) => {
            let scriptInsMutEvents = Array.from(mutationsList).filter((mutation) => {
                let scriptInsertions = Array.from(mutation.addedNodes).filter((node) => {
                    return (node.nodeName === 'SCRIPT') ? true : false;
                });
                return (scriptInsertions.length > 0) ? true : false;
            });
            if (scriptInsMutEvents.length > 0) {
                // If at least one added node corresponds to the lecture entry
                // bubble that info up and disconnect observer and continue
                singlePageObserver.disconnect();
                getDataFromSinglePage();
            }
        });
        const singlePageObserverConfig = {
            childList: true,
            subtree: true
        };
        singlePageObserver.observe(singleElem, singlePageObserverConfig);
    } else {
        // If sctipt nodes found, continue with those
        getDataFromSinglePage(scriptNodeList);
    }
}
// If on menu, get metadata from each of present lectures via API
else if (context === 'menu') {
    const menuEntryNodeList = document.querySelectorAll('.class-row[role="link"] a');
    // If no entries' link nodes found, observe until nodes are added to DOM
    if (menuEntryNodeList.length === 0) {
        let menuPageObserver = new MutationObserver((mutationsList) => {
            let lectureInsMutEvents = Array.from(mutationsList).filter((mutation) => {
                let lectureInsertions = Array.from(mutation.addedNodes).filter((node) => {
                    return (node.className.indexOf('class-row') !== -1) ? true : false;
                });
                return (lectureInsertions.length > 0) ? true : false;
            });
            if (lectureInsMutEvents.length > 0) {
                // If at least one added node corresponds to the lecture entry
                // bubble that info up and disconnect observer and continue
                menuPageObserver.disconnect();
                getDataFromMenuPage();
            }
        });
        const menuPageObserverConfig = {
            childList: true,
            subtree: true
        };
        menuPageObserver.observe(menuElem, menuPageObserverConfig);
    } else {
        // If entry link nodes found, continue with those
        getDataFromSinglePage(menuEntryNodeList);
    }
} else {
    throw Error('No context with lectures found. Try again in course menu or single lecture viewer.');
}

// Parses through script nodes in DOM and extracts data about current video from them
// based on their content.
// @param NodeList scriptNodes, list of scripts to be parsed
function getDataFromSinglePage(scriptNodes) {
    // if scriptNodes not provided or empty, get them again.
    if (!scriptNodes || scriptNodes.length === 0) {
        scriptNodes = document.querySelectorAll('script');
    }
    const scriptList = Array.from(scriptNodes).filter((script) => {
        // Keep only scripts that contain inner text and those that
        // contain keyphrases 'content.echo360.org.uk' and 'Echo'
        const currScript = script.innerText;
        if (currScript !== '' && currScript.indexOf('content.echo360.org.uk') !== -1 &&
            currScript.indexOf('Echo') !== -1) {
            return true;
        }
    });
    // Abort if no script found, hence cannot get metadata from them
    if (scriptList.length == 0) {
        throw Error('Could not find metadata about the current lecture.');
    }
    // Modifications in order to clean the JSON, 0th script should be the one
    const lectureData = safeJSONParse(stripScriptIntoJSON(scriptList[0].innerText));
    // Extract metadata and add to video list if files found
    let data = getMetadata(lectureData, context);
    if (data.files && data.files.length !== 0) {
        videoList.push(data);
    }
    sendDataToBackground(videoList);
}

// Modify entries' links to API requests for media metadata and get data from those.
// @param NodeList menuEntryLinkNodeList, list of link nodes with links to question
//                                        section for given lecture
function getDataFromMenuPage(menuEntryLinkNodeList) {
    // If link nodes not provided or empty, get them again.
    if (!menuEntryLinkNodeList || menuEntryLinkNodeList.length === 0) {
        menuEntryLinkNodeList = document.querySelectorAll('.class-row[role="link"] a');
    }
    if (menuEntryLinkNodeList.length === 0) {
        throw Error('Could not find any lectures in the course menu.');
    }
    // For each video found in menu, make a request to get its metadata
    // and wrap it in promise that resolves after request is finished.
    let promiseList = [];
    menuEntryLinkNodeList.forEach((elem, index) => {
        const fetchPromise = new Promise((resolve, reject) => {
            // Modify the link for questions section to media info request
            const link = elem.href
                .replace(/\/section\/.*?(?=\/lesson\/)/, '')
                .replace(/\/questions$/, '/media');
            let request = new XMLHttpRequest();
            request.addEventListener('load', (response) => {
                // When response fetched, add info on whether current lecture
                // already seen or not, indicated by 'highlight' class
                if (elem.closest('.class-row').querySelector('.highlight')) {
                    response.target.seenState = 'unseen';
                } else {
                    response.target.seenState = 'seen';
                }
                resolve(response.target);
            });
            request.open('GET', encodeURI(link));
            request.send();
        });
        promiseList.push(fetchPromise);
    });
    // All promises are first wrapped by reflect function that ensures
    // all promises are considered resolved even if fetch fails, so
    // all resources are processed only once all requests are done.
    Promise.all(promiseList.map(reflect))
        .then((wrpdResults) => {
            wrpdResults
                // Filter out rejected promises
                .filter(wrpdResult => wrpdResult.status === "resolved")
                .filter(filtWrpdResult => {
                    // Filter out unsuccessful requests
                    if (filtWrpdResult.v.status !== 200) {
                        console.log(`Failed to fetch lecture: ${filtWrpdResult.v.status} - ${filtWrpdResult.v.statusText}`);
                        return false;
                    }
                    return true;
                })
                .map(suxFiltWrpdResult => {
                    // Parse JSON and pass seen state info into data object
                    let parsed = safeJSONParse(suxFiltWrpdResult.v.responseText);
                    parsed.data.forEach((currData) => {
                        currData.seenState = suxFiltWrpdResult.v.seenState;
                    })
                    return parsed.data;
                })
                .forEach(responseData => {
                    // For each lecture data entry, get relevant info and pass it
                    responseData.forEach(lectureData => {
                        // Get info of interest from the data obj
                        let data = getMetadata(lectureData, context);
                        data.seenState = lectureData.seenState;
                        // If has files, add metadata obj to VideoList
                        if (data.files && data.files.length !== 0) {
                            videoList.push(data);
                        }
                    });
                });
        })
        // once all successful data added to videoList, send it
        .then(() => {
            if (videoList.length === 0) {
                throw Error('Failed to fetch metadata from any of the found lectures ');
            }
            sendDataToBackground(videoList);
        });
}

// Modify script taken from DOM to be parsable into JSON
// @param String scriptString
// @return String that should be parsable for this scenario
function stripScriptIntoJSON(scriptString) {
    let scriptJSON = scriptString.trim()
        .replace(/\n/g, ' ') // remove new lines
        .replace(/^.*?{.*?(?={)/, '') // remove text preceeding JSON
        .replace(/(.*})[^}]*}[^}]*$/, '$1') // remove text after JSON
        .replace(/\\"/g, '"') // replace double quote escapes
        .replace(/\\\//g, '/'); // replace slash escapes
    return scriptJSON;
}

// Convert JSON to object or create object with data attribute with array
// @param String jsonFile
// @return Object from JSON or {data: []}
function safeJSONParse(jsonFile) {
    try {
        return JSON.parse(jsonFile);
    } catch (e) {
        console.log(`Failed to parse JSON: ${e}`);
        return {
            data: []
        };
    }
}

// Catches both resolved and rejected values so Promise.all can be used to resolve
// once all its promises are resolved. without throwing reject
// Taken from https://stackoverflow.com/a/31424853/9788634
// @param Promise promise
// @return Object that wraps resolution of promise
function reflect(promise) {
    return promise.then(function (v) {
            return {
                v: v,
                status: "resolved"
            }
        },
        function (e) {
            return {
                e: e,
                status: "rejected"
            }
        });
}

// Extract data of interest from the metadata obtained from site or from API
// @param Object metadata, object to be fished for data of interest
// @param String context, string specifying where metadata came from, as different
//                         contexts have different metadata object structures
// @return Object, that contains only data of interest
function getMetadata(metadata, context) {
    let data = {}
    if (context === 'single') {
        // Get info of interest from the object from on-page script
        if (metadata.section && metadata.section.course) {
            data.courseName = metadata.section.course.courseName;
            data.courseId = metadata.section.course.id;
        }
        if (metadata.lesson) {
            data.name = metadata.lesson.name;
        }
        if (metadata.video) {
            data.thumbnailUrl = metadata.video.thumbnailUrl;
            data.duration = metadata.video.duration; // in milliseconds
        }
        if (metadata.video && metadata.video.current) {
            data.files = metadata.video.current.primaryFiles; // each contains: {height, s3Url, size, width}
            let audioFile = metadata.video.current.audioFiles[0];
            audioFile.isAudio = true;
            data.files.push(audioFile);
        }
        if (metadata.video && metadata.video.current && metadata.video.current.audioFiles && metadata.video.current.audioFiles.length > 0) {
            data.audio = metadata.video.current.audioFiles[0] // {s3Url, size}
        }
    } else if (context === 'menu') {
        // Get info of interest from the object from API request
        if (metadata.video && metadata.video.published) {
            data.courseName = metadata.video.published.courseName;
            data.courseId = metadata.video.published.courseId;
        }
        if (metadata.video && metadata.video.media) {
            data.name = metadata.video.media.name;
        }
        if (metadata.video && metadata.video.media && metadata.video.media.media) {
            data.thumbnailUrl = metadata.video.media.media.thumbnailUrl;
            data.duration = metadata.video.media.media.duration; // in milliseconds
        }
        if (metadata.video && metadata.video.media && metadata.video.media.media && metadata.video.media.media.current) {
            data.files = metadata.video.media.media.current.primaryFiles; // each contains: {height, s3Url, size, width}
            data.thumbnailLink = (data.files.length > 0) ? data.files[0].s3Url : data.thumbnailUrl;
            let audioFile = metadata.video.media.media.current.audioFiles[0];
            audioFile.isAudio = true;
            data.files.push(audioFile);
        }
    }
    return data;
}

// Send message with lecture data from content script to background script
// @param [Object] dataArr, array of data objects containing lecture info
function sendDataToBackground(dataArr) {
    // Send a message to background with all found videos and status
    const status = (dataArr.length > 0) ? 'success' : 'fail';
    const message = {
        status: status,
        from: 'contentScript',
        to: 'background',
        payload: {
            dataArr
        }
    };
    const messageJSON = JSON.stringify(message);
    chrome.runtime.sendMessage(messageJSON);
}