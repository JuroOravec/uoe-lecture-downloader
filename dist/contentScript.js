!function(e){var r={};function t(n){if(r[n])return r[n].exports;var i=r[n]={i:n,l:!1,exports:{}};return e[n].call(i.exports,i,i.exports,t),i.l=!0,i.exports}t.m=e,t.c=r,t.d=function(e,r,n){t.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:n})},t.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},t.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return t.d(r,"a",r),r},t.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},t.p="",t(t.s=0)}([function(e,r,t){"use strict";var n=[],i=void 0,o=document.querySelector('body[aria-label="Content viewer"]'),u=document.querySelector(".courseHome");if(o?i="single":u&&(i="menu"),"single"===i){var a=document.querySelectorAll("script");if(0===a.length){var s=new MutationObserver(function(e){Array.from(e).filter(function(e){return Array.from(e.addedNodes).filter(function(e){return"SCRIPT"===e.nodeName}).length>0}).length>0&&(s.disconnect(),d())});s.observe(o,{childList:!0,subtree:!0})}else d(a)}else{if("menu"!==i)throw Error("No context with lectures found. Try again in course menu or single lecture viewer.");var l=document.querySelectorAll('.class-row[role="link"] a');if(0===l.length){var c=new MutationObserver(function(e){Array.from(e).filter(function(e){return Array.from(e.addedNodes).filter(function(e){return-1!==e.className.indexOf("class-row")}).length>0}).length>0&&(c.disconnect(),function(e){e&&0!==e.length||(e=document.querySelectorAll('.class-row[role="link"] a'));if(0===e.length)throw Error("Could not find any lectures in the course menu.");var r=[];e.forEach(function(e,t){var n=new Promise(function(r,t){var n=e.href.replace(/\/section\/.*?(?=\/lesson\/)/,"").replace(/\/questions$/,"/media"),i=new XMLHttpRequest;i.addEventListener("load",function(t){e.closest(".class-row").querySelector(".highlight")?t.target.seenState="unseen":t.target.seenState="seen",r(t.target)}),i.open("GET",encodeURI(n)),i.send()});r.push(n)}),Promise.all(r.map(m)).then(function(e){e.filter(function(e){return"resolved"===e.status}).filter(function(e){return 200===e.v.status||(console.log("Failed to fetch lecture: "+String(e.v.status)+" - "+String(e.v.statusText)),!1)}).map(function(e){var r=f(e.v.responseText);return r.data.forEach(function(r){r.seenState=e.v.seenState}),r.data}).forEach(function(e){e.forEach(function(e){var r=v(e,i);r.seenState=e.seenState,r.files&&0!==r.files.length&&n.push(r)})})}).then(function(){if(0===n.length)throw Error("Failed to fetch metadata from any of the found lectures ");h(n)})}())});c.observe(u,{childList:!0,subtree:!0})}else d(l)}function d(e){e&&0!==e.length||(e=document.querySelectorAll("script"));var r=Array.from(e).filter(function(e){var r=e.innerText;if(""!==r&&-1!==r.indexOf("content.echo360.org.uk")&&-1!==r.indexOf("Echo"))return!0});if(0==r.length)throw Error("Could not find metadata about the current lecture.");var t=v(f(r[0].innerText.trim().replace(/\n/g," ").replace(/^.*?{.*?(?={)/,"").replace(/(.*})[^}]*}[^}]*$/,"$1").replace(/\\"/g,'"').replace(/\\\//g,"/")),i);t.files&&0!==t.files.length&&n.push(t),h(n)}function f(e){try{return JSON.parse(e)}catch(e){return console.log("Failed to parse JSON: "+String(e)),{data:[]}}}function m(e){return e.then(function(e){return{v:e,status:"resolved"}},function(e){return{e:e,status:"rejected"}})}function v(e,r){var t={};if("single"===r){if(e.section&&e.section.course&&(t.courseName=e.section.course.courseName,t.courseId=e.section.course.id),e.lesson&&(t.name=e.lesson.name),e.video&&(t.thumbnailUrl=e.video.thumbnailUrl,t.duration=e.video.duration),e.video&&e.video.current){t.files=e.video.current.primaryFiles;var n=e.video.current.audioFiles[0];n.isAudio=!0,t.files.push(n)}e.video&&e.video.current&&e.video.current.audioFiles&&e.video.current.audioFiles.length>0&&(t.audio=e.video.current.audioFiles[0])}else if("menu"===r&&(e.video&&e.video.published&&(t.courseName=e.video.published.courseName,t.courseId=e.video.published.courseId),e.video&&e.video.media&&(t.name=e.video.media.name),e.video&&e.video.media&&e.video.media.media&&(t.thumbnailUrl=e.video.media.media.thumbnailUrl,t.duration=e.video.media.media.duration),e.video&&e.video.media&&e.video.media.media&&e.video.media.media.current)){t.files=e.video.media.media.current.primaryFiles,t.thumbnailLink=t.files.length>0?t.files[0].s3Url:t.thumbnailUrl;var i=e.video.media.media.current.audioFiles[0];i.isAudio=!0,t.files.push(i)}return t}function h(e){var r={status:e.length>0?"success":"fail",from:"contentScript",to:"background",payload:{dataArr:e}},t=JSON.stringify(r);chrome.runtime.sendMessage(t)}}]);