'use strict'

// Locates DOM elements, and obtain URL(s) of video(s) available for download.
// Runs after page loads. Assumes background has 

setTimeout(function () {
    let videoList = [];
    let context;
    const targetHost = "content.echo360.org.uk";

    // locate elements unique for single and menu pages
    const singleVideoElem = document.querySelector('.video video'); // video found on lecture page
    const menuVideoElemList = document.querySelectorAll('.class-row[role="link"]'); // lecture entries

    // Decide if on a video (single) or on menu 
    if (singleVideoElem) {
        context = 'single';
    } else if (menuVideoElemList.length > 0) {
        context = 'menu';
    } else {
        context = 'none';
    }

    // if on single, select video and take its source
    if (context === 'single') {
        const videoSrc = singleVideoElem.src;
        let data = {};

        // get video metadata from one of scripts sent to page 
        // (done as workaround to the fact that script cannot communicate with other JS)
        const scriptsList = document.querySelectorAll('script');
        scriptsList.forEach(function (script) {
            // ignore scripts that don't directly contain text
            // and those that don't contain keyphrase targetHost
            const currScript = script.innerText;
            if (currScript === '' || currScript.indexOf(targetHost) === -1) {
                return;
            }
            // modifications in order to clean the text into JSON
            // TO DO CLEAN THIS UP
            // TO DO CLEAN THIS UP
            // TO DO CLEAN THIS UP
            // TO DO CLEAN THIS UP
            var splitScript = currScript.split(/{/g);
            splitScript.shift();
            splitScript.shift();
            splitScript = splitScript.join('{');
            splitScript = splitScript.split(/}/g);
            splitScript.pop();
            splitScript.pop();
            splitScript = splitScript.join('}');
            splitScript = '{' + splitScript + '}';
            splitScript = splitScript.replace(/\\"/g, '"');
            splitScript = splitScript.replace(/\\\//g, '/');
            let splitScriptJSON;
            // convert the script to JSON
            try {
                splitScriptJSON = JSON.parse(splitScript);
            } catch (e) {
                splitScriptJSON = {};
            }
            // Get info of interest from the JSON
            if (splitScriptJSON.section && splitScriptJSON.section.course) {
                data.courseName = splitScriptJSON.section.course.courseName;
                data.courseId = splitScriptJSON.section.course.courseIdentifier;
            }
            if (splitScriptJSON.video) {
                data.thumbnailUrl = splitScriptJSON.video.thumbnailUrl;
                data.duration = splitScriptJSON.video.duration; // originally in milliseconds
            }
            if (splitScriptJSON.video && splitScriptJSON.video.current) {
                data.files = splitScriptJSON.video.current.primaryFiles; // each contains: {height, s3Url, size, width}
            }
            if (splitScriptJSON.lesson) {
                data.name = splitScriptJSON.lesson.displayName;
            }
        });
        // Check if obtained video url points to right host
        // If so, add it along with other metadata to VideoList
        const hostRegex = new RegExp(targetHost);
        if (videoSrc.search(hostRegex) !== -1) {
            data.videoUrl = videoSrc;
            videoList.push(data);
        }
    }
    // else if on menu, access each of vid that's available
    else if (context && context === 'menu') {
        // TO DO PARSE MENU AND DO ITS LOGIC
        // TO DO PARSE MENU AND DO ITS LOGIC
        // TO DO PARSE MENU AND DO ITS LOGIC
        // TO DO PARSE MENU AND DO ITS LOGIC
        // TO DO PARSE MENU AND DO ITS LOGIC
        // TO DO PARSE MENU AND DO ITS LOGIC
    }

    // send a message to background with all found videos and status
    let status = (videoList.length > 0) ? 'success' : 'fail';
    let message = {
        status: status,
        from: 'videoSrcFetcher',
        to: 'background',
        payload: {
            videoList
        }
    };
    const messageJSON = JSON.stringify(message);
    chrome.runtime.sendMessage(messageJSON);
}, 1000);