!function(e){var r={};function o(t){if(r[t])return r[t].exports;var n=r[t]={i:t,l:!1,exports:{}};return e[t].call(n.exports,n,n.exports,o),n.l=!0,n.exports}o.m=e,o.c=r,o.d=function(e,r,t){o.o(e,r)||Object.defineProperty(e,r,{configurable:!1,enumerable:!0,get:t})},o.r=function(e){Object.defineProperty(e,"__esModule",{value:!0})},o.n=function(e){var r=e&&e.__esModule?function(){return e.default}:function(){return e};return o.d(r,"a",r),r},o.o=function(e,r){return Object.prototype.hasOwnProperty.call(e,r)},o.p="",o(o.s=0)}([function(e,r,o){"use strict";setTimeout(function(){var e=[],r=document.querySelector(".video video"),o=document.querySelectorAll('.class-row[role="link"]');if("single"===(r?"single":o.length>0?"menu":"none")){var t=r.src,n={};document.querySelectorAll("script").forEach(function(e){var r=e.innerText;if(""!==r&&-1!==r.indexOf("content.echo360.org.uk")){var o=r.split(/{/g);o.shift(),o.shift(),(o=(o=o.join("{")).split(/}/g)).pop(),o.pop(),o=(o=(o="{"+(o=o.join("}"))+"}").replace(/\\"/g,'"')).replace(/\\\//g,"/");var t=void 0;try{t=JSON.parse(o)}catch(e){t={}}t.section&&t.section.course&&(n.courseName=t.section.course.courseName,n.courseId=t.section.course.courseIdentifier),t.video&&(n.thumbnailUrl=t.video.thumbnailUrl,n.duration=t.video.duration),t.video&&t.video.current&&(n.files=t.video.current.primaryFiles),t.lesson&&(n.name=t.lesson.displayName)}});var i=new RegExp("content.echo360.org.uk");-1!==t.search(i)&&(n.videoUrl=t,e.push(n))}var c={status:e.length>0?"success":"fail",from:"videoSrcFetcher",to:"background",payload:{videoList:e}},s=JSON.stringify(c);chrome.runtime.sendMessage(s)},1e3)}]);