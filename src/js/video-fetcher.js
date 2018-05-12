// Given a url of a lecture, access resources and fetch the url of the video 

var x = function (lectureUrl) {
    const website = 'https://echo360.org.uk';

    // Check if input is correct
    const regex = new RegExp('^' + website);
    if (typeof (lectureUrl) == 'string' && lectureUrl.search(regex) != -1) {
        console.log('url is correct');
    } else {
        console.log('url is incorrect');
        throw TypeError('URL does not point to echo360.org.uk');
    }




};



export default x;