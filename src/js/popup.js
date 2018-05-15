'use strict'

import css from '../scss/main.scss';

document.body.insertAdjacentHTML('beforeend', require('../html/popup.html'));
chrome.storage.local.get('videos', function (response) {
    // USED FOR TESTING PURPOSES
    // let copy = JSON.parse(JSON.stringify(response.videos[0]));
    // let copy2 = JSON.parse(JSON.stringify(response.videos[0]));
    // copy2.courseId = 'XXXXXX';
    // copy2.courseName = 'A totally new and cool course!';
    // response.videos.push(copy);
    // response.videos.push(copy2);

    // For each video from the storage (= videos found on current page)
    // - Create DOM objects with to be shown in popup
    // - Add listeners for selecting sizes and triggering download
    response.videos.forEach(function (video) {
        // Create course container for each course if not found, or select existing 
        if (video.courseId === '') {
            video.courseId = 'Other';
        }
        let lectureContainerElem = document.querySelector(`#${video.courseId} .lectures-container`);
        if (!lectureContainerElem) {
            const courseHtml = require('../html/course.html');
            let popupElem = document.querySelector('.popup');
            popupElem.insertAdjacentHTML('beforeend', formatHtml(courseHtml, video));
            lectureContainerElem = document.querySelector(`#${video.courseId} .lectures-container`);
        }
        // Insert video data into the html and insert into respective course
        const lectureHtml = require('../html/lecture.html');
        lectureContainerElem.insertAdjacentHTML('beforeend', formatHtml(lectureHtml, video));
        // Select the just-inserted element
        const lectureElems = lectureContainerElem.querySelectorAll('.lecture');
        const insertedLectureElem = lectureElems[lectureElems.length - 1];
        // Add href and trim it, b/c there's some artifact
        let linkElem = insertedLectureElem.querySelector('a');
        linkElem.innerHTML = linkElem.innerHTML.trim();
        // Insert size option for download for each available download size
        let optionsElem = insertedLectureElem.querySelector('.download-options');
        if (!optionsElem) {
            return;
        }
        const optionHtml = require('../html/downloadOption.html');
        const nameEscaped = video.name.toLowerCase().replace(/ /g, '-');
        video.files.forEach((fileObj) => {
            // Set the lower of the file dimensions to represent the file resolution
            fileObj.res = Math.min(fileObj.width, fileObj.height).toString() + 'p';
            fileObj.nameEscaped = nameEscaped;
            // Insert the fileObj data into optionHtml and that into .download-options
            optionsElem.insertAdjacentHTML('beforeend', formatHtml(optionHtml, fileObj));
        });
    });

    // Add listener to update download size on checking download options
    // (tracks clicks and Enter presses for accessibility)
    document.querySelectorAll('.option, .option input').forEach((elem) => {
        elem.addEventListener('click', (event) => {
            updateDownloadSize(event, elem);
        });
        elem.addEventListener('keypress', (event) => {
            updateDownloadSize(event, elem);
        });
    });
    // Add listener to gather and send data for download func to background
    // when Click/Enter on download button
    document.querySelectorAll('.download-button').forEach((elem) => {
        elem.addEventListener('click', () => {
            sendDownloadCommand(elem);
        });
    });
    // Add listener fo accessibility feature to (un)select video size
    // when Enter keypress on focused label of size option
    document.querySelectorAll('.option').forEach((elem) => {
        elem.addEventListener('keypress', (event) => {
            if (event.keyCode == 13) {
                const targetCheckboxElem = event.target.querySelector('input[type="checkbox"]');
                const currState = targetCheckboxElem.checked;
                targetCheckboxElem.checked = currState ? false : true;
            }
        });
    });
});

// Update and display total size of all files selected for download
// @param eventObject event, HTMLnode elem
function updateDownloadSize(event, elem) {
    // if triggered by keypress, listen only for Enter keypress
    if (event.type === 'keypress' && event.keyCode !== 13) {
        return;
    }
    const parentElem = elem.closest('.lecture-desc');
    const downloadSizeElem = parentElem.querySelector('.download-size');
    let buttonElem = parentElem.querySelector('.download-button');
    if (!parentElem || !downloadSizeElem || !buttonElem) {
        return;
    }
    // Sum up sizes of selected files and display the total size
    // Wrapped in timeout so checkboxes update first
    setTimeout(() => {
        const selectedElemList = parentElem.querySelectorAll('input[type="checkbox"]:checked');
        let totalSize = Array.from(selectedElemList).reduce((total, selectedSizeElem) => {
            let currSize = Number(selectedSizeElem.value.match(/size-(\d*?)-/)[1]);
            if (Number.isNaN(currSize) === true) {
                currSize = 0;
            }
            return total + currSize;
        }, 0);
        downloadSizeElem.innerHTML = humanFileSize(totalSize, true);
        // Disable download button if none checked
        if (selectedElemList.length === 0) {
            buttonElem.disabled = true;
        } else {
            buttonElem.disabled = false;
        }
    }, 0);
};

// Gather data of selected sizes for download, and send this to background
// script to initiate download.
// @param HTMLnode elem
function sendDownloadCommand(elem) {
    const parentElem = elem.closest('.lecture-desc');
    if (!parentElem) {
        return;
    }
    // Dather data from available elements
    const courseElem = elem.closest('.course-container');
    const courseName = courseElem ? courseElem.querySelector('.course-title').innerHTML : '';
    const titleElem = parentElem.querySelector('.lecture-title');
    const name = titleElem ? titleElem.innerHTML : '';
    // For each selected size, push its data to array as obj of options for download func
    const selectedElemList = parentElem.querySelectorAll('input[type="checkbox"]:checked');
    let downloadQueryList = Array.from(selectedElemList).map((selectedSizeElem) => {
        const size = selectedSizeElem.value.match(/size-(\d*?)-/)[1];
        const res = selectedSizeElem.value.match(/res-(.*?)-/)[1];
        const url = selectedSizeElem.value.match(/url-(.*)$/)[1];
        const ext = url.match(/(\.[^.]*?)(?=\?)/)[1]; // get extension e.g. "...xxx.mp4?..."
        let downloadOptions = {
            url: url,
            filename: courseName + '/' + name + '-' + res + ext,
            saveAs: false,
        };
        return downloadOptions;
    });
    // Compose and send message with all the download options to background
    let message = {
        status: 'success',
        from: 'popup',
        to: 'background',
        payload: {
            downloadQueryList
        }
    };
    let messageJSON = JSON.stringify(message);
    chrome.runtime.sendMessage(messageJSON);
}

// Extract ${variables} from html and replace them with data from obj
// @param string html, object obj
// @return string with replaced instances of ${...}
function formatHtml(html, obj) {
    if (typeof (obj) !== 'object') {
        throw TypeError('Expected argument to be object, got ' + typeof (obj));
    }
    let htmlVariables = html.match(/\${.*?}/g);
    let htmlNew = html;
    // remove duplicately extracted variables
    htmlVariables = htmlVariables.filter((item, index, array) => {
        return array.indexOf(item) === index;
    });
    htmlVariables.forEach((variableBracketed) => {
        // replace "${var}" to "var"
        const variable = variableBracketed.replace(/\${(.*?)}/, '$1');
        if (typeof (obj[variable]) === 'undefined') {
            obj[variable] = '';
        }
        // replace all instances of '${var}' with what's in obj[var]
        const variableRegex = new RegExp('\\${' + variable + '}', 'g');
        htmlNew = htmlNew.replace(variableRegex, obj[variable]);
    });
    return htmlNew;
}

// Convert bytes to human-readable format e.g. "1.14 Mb".
// @param int bytes, boolean si, int precision
// @return string e.g. "13.2 Kb"
// Taken from https://stackoverflow.com/a/14919494/9788634
function humanFileSize(bytes, si, precision = 2) {
    if (Number.isNaN(Number(bytes))) {
        return NaN;
    } else if (bytes === 0) {
        return '';
    }
    let thresh = si ? 1000 : 1024;
    if (Math.abs(bytes) < thresh) {
        return bytes + ' B';
    }
    let units = si ? ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] : ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'];
    let u = -1;
    do {
        bytes = bytes / thresh;
        ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(precision) + ' ' + units[u];
}