'use strict'

import css from '../scss/main.scss';

setTimeout(() => {
    document.body.insertAdjacentHTML('beforeend', require('../html/popup.html'));
    chrome.storage.local.get('videos', (response) => {
        // For each video from the storage (= videos found on current page)
        // - Create DOM objects with to be shown in popup
        // - Add listeners for selecting sizes and triggering download
        response.videos.forEach((video) => {
            // Fill in course name and id if missing 
            video.courseName = (video.courseName === '') ? 'Other' : video.courseName;
            if (video.courseId == '') {
                video.courseId = video.courseName.toLowerCase()
                    .replace(/ /g, '-') // escape spaces with hyphens
                    .replace(/^-*/g, '') // remove hyphens at start
                    .replace(/[^A-Za-z0-9_-]/g, ''); // remove any unallowed characters
            }

            // Create container for each course if not found, or select existing
            let course = document.querySelector(`#course-${video.courseId}`);
            if (!course) {
                const courseHtml = require('../html/course.html');
                let coursesWrap = document.querySelector('.courses');
                coursesWrap.insertAdjacentHTML('beforeend', formatHtml(courseHtml, video));
                course = coursesWrap.querySelector(`#course-${video.courseId}`);
            }
            let lectureWrap = course.querySelector('.lectures');

            // Insert video data into lecture html and insert it into respective course
            const lectureHtml = require('../html/lecture.html');
            lectureWrap.insertAdjacentHTML('beforeend', formatHtml(lectureHtml, video));
            // Select the just-inserted element
            const lectures = lectureWrap.querySelectorAll('.lecture');
            const insertedLecture = lectures[lectures.length - 1];

            // Add href and trim it, because there's some artifact
            let link = insertedLecture.querySelector('a');
            link.innerHTML = link.innerHTML.trim();

            // Prepare values for inserting download options
            let downloadOptionsWrap = insertedLecture.querySelector('.download-options');
            const optionHtml = require('../html/downloadOption.html');
            const nameEscaped = video.name.toLowerCase().replace(/ /g, '-');
            let availableSizeOptions = Array.from(course.querySelectorAll('.size-option input'))
                .map(elem => elem.value);
            let sizeSelectWrap = course.querySelector('.select-by-format');
            let sizeOptionHtml = require('../html/sizeSelectOption.html');

            // Insert size option for download for each available download size
            video.files.forEach((fileObj) => {
                // Set the lower of the file dimensions to represent the file format,
                // or its extension if it is audio file.
                if (fileObj.isAudio) {
                    fileObj.format = fileObj.s3Url.match(/\.([^.]*?)((?=\?)|$)/)[1];
                } else {
                    fileObj.format = Math.min(fileObj.width, fileObj.height).toString() + 'p';
                }
                fileObj.nameEscaped = nameEscaped;
                // Insert the fileObj data into optionHtml and that into .download-options
                downloadOptionsWrap.insertAdjacentHTML('beforeend', formatHtml(optionHtml, fileObj));
                // If size selector for this format doesn't exist yet, create new and keep track of it
                if (sizeSelectWrap && !availableSizeOptions.includes(fileObj.format)) {
                    sizeSelectWrap.insertAdjacentHTML('beforeend', formatHtml(sizeOptionHtml, fileObj));
                    availableSizeOptions.push(fileObj.format);
                }
            });

            // After the lecture entry has been added, update course lecture count
            let lectureCountElem = course.querySelector('.lecture-count');
            if (!lectureCountElem) {
                return;
            }
            let lectureCount = course.querySelectorAll('.lecture').length.toString();
            lectureCountElem.innerHTML = lectureCount;
        });
        // After all lectures are inserted, remove seen categories, if lectures do not have that info
        document.querySelectorAll('.course').forEach((course) => {
            let seenElArr = Array.from(course.querySelectorAll('.seen-state span')).filter((seenEl) => {
                return seenEl.innerText !== '';
            })
            if (seenElArr.length === 0) {
                let seenParentEl = course.querySelector('.select-by-seen');
                seenParentEl.style.width = seenParentEl.offsetWidth + 'px';
                seenParentEl.innerHTML = '';
            }
        });


        //
        //      Event Listeners
        //



        // Add listener that activates download button and updates displayed size
        // for both lecture download button and download all button when any download
        // option is de-/activated
        let downloadAllWrap = document.querySelector('.download-all');
        let downloadAllBtn = downloadAllWrap.querySelector('.download-all-btn');
        let downloadAllSize = downloadAllBtn.querySelector('.download-all-size');

        document.querySelectorAll('.option, .option input').forEach((elem) => {
            const inputEl = (elem.nodeName !== 'INPUT') ? elem.querySelector('input') : elem;
            let downloadLecWrap = inputEl.closest('.lecture').querySelector('.download');
            let downloadLecBtn = downloadLecWrap.querySelector('.download-btn');
            let downloadLecSize = downloadLecWrap.querySelector('.download-size');
            // Callback that will be called on both click and Enter
            let downloadOptionCallback = (event) => {
                // Add support for Enter
                if (event.type === 'keypress' && event.keyCode !== 13) {
                    return
                } else if (event.type === 'keypress' && event.keyCode == 13 && elem.nodeName !== 'INPUT') {
                    inputEl.checked = !inputEl.checked;
                }
                // Update the lecture download button
                const downloadLecActiveList = inputEl.closest('.lecture').querySelectorAll('input[type="checkbox"]:checked');
                updateDownloadSize(downloadLecWrap, downloadLecBtn, downloadLecSize, downloadLecActiveList);
                // Update the download all button
                const downloadAllActiveList = document.querySelectorAll('.download-btn:enabled .download-size');
                updateDownloadSize(downloadAllWrap, downloadAllBtn, downloadAllSize, downloadAllActiveList);
                // Update format category options (check if the format is active for all lectures within
                // course that have the same seen state as currently selected)
                updateFormatCategoryOptions(inputEl);
            }
            elem.addEventListener('click', downloadOptionCallback);
            elem.addEventListener('keypress', downloadOptionCallback);
            // Change is triggered by changing selected options via category selectors
            elem.addEventListener('change', downloadOptionCallback);
        });


        // Add listener that toggles ON download options within course within selected formats
        // and within selected seen category WHEN a seen category is changed. Toggles OFF download
        // options within course within format category but outside seen category.
        document.querySelectorAll('.course-select .select-by-seen label').forEach((elem) => {
            // Select radio button in case label triggered event, and update the seen category
            let radioElem = (elem.nodeName !== 'INPUT') ? elem.querySelector('input[type="radio"]') : elem;
            let toggleLogic = (bool) => {
                return bool ? bool : true;
            }
            elem.addEventListener('click', (event) => {
                selectCategCallback(event, radioElem, 'select-by-seen', toggleLogic);
            });
            elem.addEventListener('keypress', (event) => {
                selectCategCallback(event, radioElem, 'select-by-seen', toggleLogic);
            });
        });

        // Add listener that toggles OFF/ON download options within course within selected formats
        // and within selected seen category WHEN a new format category is un/selected.
        document.querySelectorAll('.course-select .select-by-format label').forEach((elem) => {
            let checkboxEl = (elem.nodeName !== 'INPUT') ? elem.querySelector('input[type="checkbox"]') : elem;
            let toggleLogic = (bool) => {
                return !bool;
            }
            elem.addEventListener('click', (event) => {
                selectCategCallback(event, checkboxEl, 'select-by-format', toggleLogic);
            });
            elem.addEventListener('keypress', (event) => {
                selectCategCallback(event, checkboxEl, 'select-by-format', toggleLogic);
            });
        });

        // Add listener to gather and send data for download func to background
        // when Click/Enter on download button
        document.querySelectorAll('.download-btn').forEach((elem) => {
            elem.addEventListener('click', (event) => {
                event.preventDefault();
                sendDownloadCommand(event, elem);
            });
            elem.addEventListener('keypress', (event) => {
                event.preventDefault();
                sendDownloadCommand(event, elem);
            });
        });

        // Add listener to gather ALL selected downloads and send data to background
        // to initiate downlaod
        document.querySelectorAll('.download-all-btn').forEach((elem) => {
            let downloadAllCallback = (event) => {
                event.preventDefault();
                let downloadBtns = Array.from(document.querySelectorAll('.download-btn:enabled'));
                sendDownloadCommand(event, downloadBtns);
            }
            elem.addEventListener('click', downloadAllCallback);
            elem.addEventListener('keypress', downloadAllCallback);
        });
    });
}, 0);


//
//      Functions
//


// Update and display total size for download button
// @param Node parentEl, node that wraps btn and size els
//        Node btnEl, the download button
//        Node sizeEl, el that displays size. Must have data-size attribute with size of its file
//        NodeList activeElList, nodes that are used to determine whether download button
//                               has any active download options. Each node must have data-size.
function updateDownloadSize(parentEl, btnEl, sizeEl, activeElList) {
    if (!parentEl || !btnEl || !sizeEl) {
        console.error('Could not update download size, one or more of necessary elements are missing.');
        return;
    }
    // Disable download button if none active, or enable otherwise
    if (activeElList.length === 0) {
        btnEl.disabled = true;
        parentEl.classList.remove('active');
    } else {
        btnEl.disabled = false;
        parentEl.classList.add('active');
    }
    // Update shown download size as sum of all active sizes and set it to dataset
    let totalSize = Array.from(activeElList).reduce((total, activeEl) => {
        let currSize = Number(activeEl.dataset.size);
        currSize = (Number.isNaN(currSize) === true) ? 0 : currSize;
        return total + currSize;
    }, 0);
    sizeEl.dataset.size = totalSize;
    sizeEl.innerHTML = humanFileSize(totalSize, true);
};

// Turn ON format category option if all lectures that would be selected by it (given current seen
// category) are already ON. Likewise, turn it OFF if it is on (so all its lectures are ON) and one
// of the options it would select gets turned OFF.
function updateFormatCategoryOptions(elem) {
    // Determine which lectures by seen category should be included in selection process
    const parentCourse = elem.closest('.course');
    const currSeenStateElem = parentCourse.querySelector('.select-by-seen input[type="radio"]:checked');
    const currSeenState = (currSeenStateElem) ? currSeenStateElem.value : 'all';
    // Set CSS class to select lectures within the selected seen category
    const lectureClass = (currSeenState !== 'all' && currSeenState !== '') ? `.${currSeenState}` : '';
    const thisFormat = elem.dataset.format;
    // Get format category checkbox that will be un-/checked if necessary
    let formatSelect = parentCourse.querySelector(`.course-select .select-by-format input[value="${thisFormat}"]`);

    // If download option becomes unchecked, check if the lecture in which it was unchecked
    // is currently selected by format category. If not, nothing changes because the category checkbox
    // is already unchecked. If it is, uncheck the categoy checkbox as not all lectures that fall into
    // that category are selected any longer.
    if (elem.checked === false) {
        formatSelect.checked = elem.closest(`.lecture${lectureClass}`) ? false : formatSelect.checked;
    }
    // If download option becomes checked, compare how many lectures that have the same category class
    // also have the same format selected. If it is all, loot at the category checkbox, and if
    // not checked yet, check it, because all its lectures are checked. 
    else if (elem.checked === true) {
        // Comparing both checked and unchecked in case there's 0 checkboxes
        // overall, because then also unchecked would be 0, which is used to 
        // determine if category checkbox should be checked.
        let courseSameFormatInputs = parentCourse.querySelectorAll(`.lecture${lectureClass} .download-options input[type="checkbox"].size-${thisFormat}`);
        let courseSameFormatInputsUnchecked = Array.from(courseSameFormatInputs).filter((checkbox) => {
            return !checkbox.checked;
        });
        if (courseSameFormatInputs.length > 0 && courseSameFormatInputsUnchecked.length === 0) {
            formatSelect.checked = formatSelect.checked ? formatSelect.checked : true;
        }
    }
}

// Select all download options based on format and on seen category within course,
// set them to new state, and trigger change event to update download buttons.
// @param HTMLNode parentContainer, el that contains all lectures of interest
// @param [String] formatCategArr, arr of currently active format categories
// @param String lectureClassSelector, selector specifying desired lectures
// @param Boolean newState, to which the options should be updated to
function toggleDownloadOptions(parentContainer, formatCategArr, lectureClassSelector, newState) {
    if (!Array.isArray(formatCategArr)) {
        formatCategArr = [formatCategArr];
    }
    let combinedSelector = formatCategArr.map(format => {
        return `.lecture${lectureClassSelector} .download-options input[type="checkbox"].size-${format}`;
    }).join(', ');
    parentContainer.querySelectorAll(combinedSelector).forEach((el) => {
        if (el.checked !== newState) {
            let eve = new Event('change');
            el.checked = newState;
            el.dispatchEvent(eve);
        }
    });
}

// Generate CSS class selectors to select elements with and exclusively without
// given class
// @param String classStr, string to be used as class selector
// @return [String, String], first is within selector, second is outside selector
function getWithinOutsideSeenSelectors(classStr) {
    let withinClass = (classStr !== 'all' && classStr !== '') ? `.${classStr}` : '';
    let outsideClass = (withinClass !== '') ? `:not(${withinClass})` : '';
    return [withinClass, outsideClass];
}

// Callback for changing values of categories. Checks/Unchecks all relevant/irrelevant
// download options based on the combination seen category and format that are toggled
function selectCategCallback(event, inputEl, categClassName, toggleLogic) {
    event.preventDefault();
    if (event.type === 'keypress' && event.keyCode !== 13) {
        return;
    }
    let checkedBefore = inputEl.checked;
    inputEl.checked = toggleLogic(inputEl.checked);
    // If nothing changed in the category selector, don't do anything
    if (inputEl.checked === checkedBefore) {
        return;
    }
    const parentCourse = inputEl.closest('.course');
    // Get seen state either from itself (if member of seen categ), or look for checked seen categ
    let seenState;
    if (inputEl.closest('.select-by-seen')) {
        seenState = inputEl.value;
    } else {
        const seenStateElem = parentCourse.querySelector('.select-by-seen input:checked');
        seenState = (!seenStateElem) ? 'all' : seenStateElem.value;
    }
    // Get names of all currently selected options, either from self (if member of format categ) or look for checked formats
    let selectedFormats = [];
    if (inputEl.closest('.select-by-format')) {
        selectedFormats.push(inputEl.value);
    } else {
        selectedFormats = Array.from(parentCourse.querySelectorAll(`.select-by-format input:checked`))
            .map(item => item.value);
    }
    // Based on seen categories, create one CSS selectors that will select only lectures
    // within that category, and one for only outside that category
    const selectorsBySeen = getWithinOutsideSeenSelectors(seenState);
    // Toggle (to same val as format selector) download options selected by format category of lectures
    // selected by seen category, and trigger download size update.
    toggleDownloadOptions(parentCourse, selectedFormats, selectorsBySeen[0], inputEl.checked);
    // Untoggle download options selected by format category of lectures
    // NOT selected by seen category, and trigger shown download size update.
    // Skip if selected seen category either 'all' or not selected
    if (selectorsBySeen[1] !== '') {
        toggleDownloadOptions(parentCourse, selectedFormats, selectorsBySeen[1], false);
    }
}

// Gather data of selected sizes for each given download button, and send this
// to background script to initiate download.
// @param EventObject event, that triggered this function
// @param [HTMLnode] elemList, active download buttons.
function sendDownloadCommand(event, elemList) {
    if (!Array.isArray(elemList)) {
        elemList = [elemList];
    }
    if (event.type === 'keypress' && event.keyCode !== 13 || elemList.length === 0) {
        return;
    }
    // For each download button, see what formats are checked in that lecture
    // get data from each of them and push them to the download query
    let downloadQueryList = [];
    elemList.forEach((elem, index) => {
        const parentElem = elem.closest('.lecture-desc');
        if (!parentElem) {
            console.error('Failed to get data for download: Could not find ".lecture-desc" ancestor element.');
            return;
        }
        // Dather data on current lecture
        const course = elem.closest('.course');
        const courseTitleElem = course ? course.querySelector('.course-title') : null;
        const courseTitle = courseTitleElem ? courseTitleElem.innerHTML : 'Other Courses';
        const lectureTitleElem = parentElem.querySelector('.lecture-title');
        const lectureTitle = lectureTitleElem ? lectureTitleElem.innerHTML : `Lecture ${index + 1}`;
        // Find all selected sizes for given lecture and push their data to download query
        const selectedElemList = parentElem.querySelectorAll('input[type="checkbox"]:checked');
        Array.from(selectedElemList).forEach((selectedFormatElem) => {
            const size = selectedFormatElem.dataset.size;
            const format = selectedFormatElem.dataset.format;
            const url = selectedFormatElem.dataset.url;
            const ext = url.match(/(\.[^.]*?)((?=\?)|$)/)[1]; // get extension e.g. "...xxx.mp4?..."
            let downloadOptions = {
                url: url,
                filename: courseTitle + '/' + lectureTitle + '-' + format + ext,
                saveAs: false,
            };
            downloadQueryList.push(downloadOptions);
        });
    });
    // Compose and send message with all the download options to background
    let status = (downloadQueryList.length > 0) ? 'success' : 'fail';
    let message = {
        status: status,
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
// @param String html, object obj
// @return String with replaced instances of ${...}
function formatHtml(html, obj) {
    if (typeof (obj) !== 'object') {
        throw TypeError('Expected argument to be object, got ' + typeof (obj));
    }
    let htmlVariables = html.match(/\${.*?}/g);
    let htmlNew = html;
    // Remove duplicately extracted variables
    htmlVariables = htmlVariables.filter((item, index, array) => {
        return array.indexOf(item) === index;
    });
    htmlVariables.forEach((variableBracketed) => {
        // Replace "${var}" to "var"
        const variable = variableBracketed.replace(/\${(.*?)}/, '$1');
        if (typeof (obj[variable]) === 'undefined') {
            obj[variable] = '';
        }
        // Replace all instances of '${var}' with what's in obj[var]
        const variableRegex = new RegExp('\\${' + variable + '}', 'g');
        htmlNew = htmlNew.replace(variableRegex, obj[variable]);
    });
    return htmlNew;
}

// Convert bytes to human-readable format e.g. "1.14 Mb".
// @param Integer bytes, Boolean si, Integer precision
// @return String e.g. "13.2 Kb"
// Taken from https://stackoverflow.com/a/14919494/9788634
function humanFileSize(bytes, si = true, precision = 2) {
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