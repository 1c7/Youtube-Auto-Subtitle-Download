// ==UserScript==
// @name           Youtube Subtitle Downloader v18
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @copyright      2009 Tim Smart; 2011 gw111zz; 2014~2018 Cheng Zheng;
// @license        GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version        18
// @grant GM_xmlhttpRequest
// @namespace https://greasyfork.org/users/5711
// @description  v18 fix long youtube video(1:36:33) only get half subtitle problem
// ==/UserScript==

/*
  [What is this?]
  This "Tampermonkey script" allow you download Youtube "Automatic subtitle" AND "closed subtitle"
  
  [Note]
  If not working(rarely), Refresh!!
  if problem still exist. Email me: guokrfans@gmail.com

  [Who build this]
  Author :  Cheng Zheng
  Email  :  guokrfans@gmail.com
  Github :  https://github.com/1c7/Youtube-Auto-Subtitle-Download
  If you want improve the script, Github Pull Request are welcome

  [Note]
  Few things before you read the code: 
  0. Some code comments are written in Chinese
  1. Youtube have 2 UI: Material design and The old design 
  2. Code need handle both Auto & Closed subtitle

  (Explain: "Tampermonkey script" mean 
  you have to install a Chrome extension call "Tampermonkey", and then install this script)

  [Test Video]
  https://www.youtube.com/watch?v=bkVsus8Ehxs
  only have English closed subtitle, nothing else (no auto subtitle)

  https://www.youtube.com/watch?v=-WEqFzyrbbs
  no subtitle at all

  https://www.youtube.com/watch?v=9AzNEG1GB-k
  have a lot subtitle 

  https://www.youtube.com/watch?v=tqGkOvrKGfY
  1:36:33  super long subtitle

  [Code Explain]
  mainly three part
    1. UI specific (add button on page etc)
    2. detech if subtitle exists
    3. transform subtitle format & download

   [Changelog]
    v1~v15: I forgot, and I am too lazy to check git log

    v16: add support for auto subtitle
    
    v17: fix few minor issue in v16, to make sure all user get update, bump up 1 version
    
    v18: fix https://greasyfork.org/zh-CN/forum/discussion/38299/x?locale=zh-CN  video too long issue
    (for example 1:36:33) and cause subtitle error
    reason is the 'downloadFile' function 
    using a <a> element 'href' attribute to download .srt file.
    and this 'href' can't handle string that's too long
*/

// text for display
var NO_SUBTITLE = 'No subtitle';
var HAVE_SUBTITLE = 'Download subtitle';

// initialize
var first_load = true; // indicate if first load this webpage or not
var youtube_playerResponse_1c7 = null; // for auto subtitle
unsafeWindow.caption_array = []; // store all subtitle

// trigger when first load
$(document).ready(function(){
    start();
});

// Explain this function: we repeatly try if certain HTML element exist, 
// if it does, we call init()
// if it doesn't, stop trying after certain time
function start(){
    var retry_count = 0;
    var RETRY_LIMIT = 20;
    // use "setInterval" is because "$(document).ready()" still not enough, still too early
    // 330 work for me.
    if (new_material_design_version()) {
        var material_checkExist = setInterval(function () {
            if (document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer').length) {
                init();
                clearInterval(material_checkExist);
            }
            retry_count = retry_count + 1;
            if (retry_count > RETRY_LIMIT) {
                clearInterval(material_checkExist);
            }
        }, 330);
    } else {
        var checkExist = setInterval(function () {
            if ($('#watch7-headline').length) {
                init();
                clearInterval(checkExist);
            }
            retry_count = retry_count + 1;
            if (retry_count > RETRY_LIMIT) {
                clearInterval(checkExist);
            }
        }, 330);
    }
}

// trigger when loading new page 
// (actually this would also trigger when first loading, that's not what we want, that's why we need to use firsr_load === false)
// (new Material design version would trigger this "yt-navigate-finish" event. old version would not.)
var body = document.getElementsByTagName("body")[0];
body.addEventListener("yt-navigate-finish", function(event) {
    if (current_page_is_video_page() === false) {
        return;
    }
    youtube_playerResponse_1c7 = event.detail.response.playerResponse; // for auto subtitle
    unsafeWindow.caption_array = []; // clean up (important, otherwise would have more and more item and cause error)

    // if use click to another page, init again to get correct subtitle
    if(first_load === false){
        remove_subtitle_download_button();
        init();
    }
});

// trigger when loading new page
// (old version would trigger "spfdone" event. new Material design version not sure yet.)
window.addEventListener("spfdone", function(e) {
    if(current_page_is_video_page()){
        remove_subtitle_download_button();
        var checkExist = setInterval(function() {
            if ($('#watch7-headline').length) {
                init();
                clearInterval(checkExist);
            }
        }, 330);
    }
});

// return true / false
// Detect [new version UI(material design)] OR [old version UI]
// I tested this, accurated.
function new_material_design_version() {
    var old_title_element = document.getElementById('watch7-headline');
    if (old_title_element) {
        return false;
    } else {
        return true;
    }
}

// return true / false
function current_page_is_video_page(){
    return get_video_id() !== null;
}

// return string like "RW1ChiWyiZQ",  from "https://www.youtube.com/watch?v=RW1ChiWyiZQ"
// or null
function get_video_id(){
    return getURLParameter('v');
}

//https://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function remove_subtitle_download_button(){
    $('#youtube-subtitle-downloader-by-1c7').remove();
}

function init(){
    inject_our_script();
    first_load = false;
}

function inject_our_script(){
    var div      = document.createElement('div'),
        select   = document.createElement('select'),
        option   = document.createElement('option'),
        controls = document.getElementById('watch7-headline');  // Youtube video title DIV

    div.setAttribute('style', `display: table; 
        margin-top:4px;
        border: 1px solid rgb(0, 183, 90); 
        cursor: pointer; color: rgb(255, 255, 255); 
        border-top-left-radius: 3px; 
        border-top-right-radius: 3px; 
        border-bottom-right-radius: 3px; 
        border-bottom-left-radius: 3px; 
        background-color: #00B75A;
    `);

    div.id = 'youtube-subtitle-downloader-by-1c7';
    div.title = 'Youtube Subtitle Download v16'; // display when cursor hover

    select.id = 'captions_selector';
    select.disabled = true;
    select.setAttribute( 'style', `display:block; 
        border: 1px solid rgb(0, 183, 90); 
        cursor: pointer; 
        color: rgb(255, 255, 255); 
        background-color: #00B75A;
        padding: 4px;
    `);

    option.textContent = 'Loading...';
    option.selected    = true;
    select.appendChild(option);

    // 下拉菜单里，选择一项后触发下载
    select.addEventListener('change', function() {
        download_subtitle(this);
    }, false);

    div.appendChild(select); // put <select> into <div>

    // put the div into page: new material design
    var title_element = document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer');
    if (title_element){
        $(title_element[0]).after(div);
    }
    // put the div into page: old version
    if(controls){
        controls.appendChild(div);
    }

    load_language_list(select);

    // <a> element is for download
    var a = document.createElement('a');
    a.style.cssText = 'display:none;';
    a.setAttribute("id", "ForSubtitleDownload");
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(a);
}

// trigger when user select <option>
function download_subtitle(selector) {
    // if user select first <option>
    // we just return, do nothing.
    if (selector.selectedIndex == 0){
        return;
    }

    var caption = caption_array[selector.selectedIndex - 1];
    // because first <option> is for display
    // so index - 1 

    // if user choose auto subtitle
    if (caption.lang_code == 'AUTO'){
        get_auto_subtitle(function(r){
            if (r != false) {
                var srt = parse_youtube_XML_to_SRT(r);
                var title = get_file_name('auto');
                // downloadFile(title, srt);
                downloadString(srt, "text/plain", title);
            }
        });
    } else { 
        // closed subtitle
        var lang_code = caption.lang_code;
        var lang_name = caption.lang_name;
        get_closed_subtitle(lang_code, function (r) {
            if (r != false) {
                var srt = parse_youtube_XML_to_SRT(r);
                var title = get_file_name(lang_name);
                // downloadFile(title, srt);
                downloadString(srt, "text/plain", title);
            }
        });
    }
    // after download, select first <option>
    selector.options[0].selected = true;
}


// Return something like: "(English)How Did Python Become A Data Science Powerhouse?.srt"
function get_file_name(x){
    return '(' + x + ')' + document.title + '.srt';
}

// detect if "auto subtitle" and "closed subtitle" exist
// and add <option> into <select>
function load_language_list(select) {
    // auto
    var auto_subtitle_exist = false;

    // closed
    var closed_subtitle_exist = false;
    var captions = null;

    // get auto subtitle
    var auto_subtitle_url = get_auto_subtitle_xml_url();
    if (auto_subtitle_url != false) {
        auto_subtitle_exist = true;
    }

    // get closed subtitle
    var list_url = 'https://video.google.com/timedtext?hl=en&v=' + get_video_id() + '&type=list';
    // Example: https://video.google.com/timedtext?hl=en&v=if36bqHypqk&type=list
    GM_xmlhttpRequest({
        method: 'GET',
        url: list_url,
        onload: function( xhr ) {
            captions = new DOMParser().parseFromString(xhr.responseText, "text/xml").getElementsByTagName('track');
            if (captions.length != 0) {
                closed_subtitle_exist = true;
            }

            // if no subtitle at all, just say no and stop
            if (auto_subtitle_exist == false && closed_subtitle_exist == false) {
                select.options[0].textContent = NO_SUBTITLE;
                disable_download_button();
                return false;
            }

            // if at least one type of subtitle exist
            select.options[0].textContent = HAVE_SUBTITLE;
            select.disabled = false;

            var caption = null; // for inside loop
            var option = null;  // for <option>
            var caption_info = null; // for our custom object

            // if auto subtitle exist
            if (auto_subtitle_exist) {
                caption_info = {
                    lang_code: 'AUTO', // later we use this to know if it's auto subtitle
                    lang_name: get_auto_subtitle_name() // for display only
                };
                caption_array.push(caption_info);

                option = document.createElement('option');
                option.textContent = caption_info.lang_name;
                select.appendChild(option);
            }

            // if closed_subtitle_exist
            if (closed_subtitle_exist) {
                for (var i = 0, il = captions.length; i < il; i++) {
                    caption = captions[i];
                    caption_info = {
                        lang_code: caption.getAttribute('lang_code'), // for AJAX request
                        lang_name: caption.getAttribute('lang_translated') // for display only
                    };
                    caption_array.push(caption_info);
                    // 注意这里是加到 caption_array, 一个全局变量, 待会要靠它来下载
                    option = document.createElement('option');
                    option.textContent = caption_info.lang_name;
                    select.appendChild(option);
                }
            }
        }
    });
}

function disable_download_button(){
    $('#youtube-subtitle-downloader-by-1c7')
        .css('border', '#95a5a6')
        .css('cursor', 'not-allowed')
        .css('background-color', '#95a5a6');
    $('#captions_selector')
        .css('border', '#95a5a6')
        .css('cursor', 'not-allowed')
        .css('background-color', '#95a5a6');

    if (new_material_design_version()) {
        $('#youtube-subtitle-downloader-by-1c7').css('padding', '6px');
    } else {
        $('#youtube-subtitle-downloader-by-1c7').css('padding', '5px');
    }
}

// 处理时间. 比如 start="671.33"  start="37.64"  start="12" start="23.029"
// 处理成 srt 时间, 比如 00:00:00,090    00:00:08,460    00:10:29,350
function process_time(s){
    s = s.toFixed(3);
    // 超棒的函数, 不论是整数还是小数都给弄成3位小数形式
    // 举个柚子:
    // 671.33 -> 671.330
    // 671 -> 671.000
    // 注意函数会四舍五入. 具体读文档

    var array = s.split('.');
    // 把开始时间根据句号分割
    // 671.330 会分割成数组: [671, 330]

    var Hour = 0;
    var Minute = 0;
    var Second = array[0];   // 671
    var MilliSecond = array[1];  // 330
    // 先声明下变量, 待会把这几个拼好就行了

    // 我们来处理秒数.  把"分钟"和"小时"除出来
    if(Second >= 60){
        Minute = Math.floor(Second / 60);
        Second = Second - Minute * 60;
        // 把 秒 拆成 分钟和秒, 比如121秒, 拆成2分钟1秒

        Hour = Math.floor(Minute / 60);
        Minute = Minute - Hour * 60;
        // 把 分钟 拆成 小时和分钟, 比如700分钟, 拆成11小时40分钟
    }
    // 分钟，如果位数不够两位就变成两位，下面两个if语句的作用也是一样。
    if (Minute < 10){
        Minute = '0' + Minute;
    }
    // 小时
    if (Hour < 10){
        Hour = '0' + Hour;
    }
    // 秒
    if (Second < 10){
        Second = '0' + Second;
    }
    return Hour + ':' + Minute + ':' + Second + ',' + MilliSecond;
}

// copy from: https://gist.github.com/danallison/3ec9d5314788b337b682
// Thanks! https://github.com/danallison
// work in Chrome 66
// test passed: 2018-5-19
function downloadString(text, fileType, fileName) {
    var blob = new Blob([text], { type: fileType });
    var a = document.createElement('a');
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(a.href); }, 1500);
}

// https://css-tricks.com/snippets/javascript/unescape-html-in-js/
// turn HTML entity back to text, example: &quot; should be "
function htmlDecode(input){
    var e = document.createElement('div');
    e.class = 'dummy-element-for-tampermonkey-Youtube-Subtitle-Downloader-script-to-decode-html-entity';
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}

// return URL or null;
// later we can send a AJAX and get XML subtitle
function get_auto_subtitle_xml_url() {
    try {
        // get JSON
        var json = '';
        if (typeof youtube_playerResponse_1c7 !== "undefined" && youtube_playerResponse_1c7 !== null && youtube_playerResponse_1c7 !== '') {
            json = youtube_playerResponse_1c7;
        } else {
            var raw_string = ytplayer.config.args.player_response;
            json = JSON.parse(raw_string);
        }

        // get data from JSON
        var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
        for (var index in captionTracks) {
            var caption = captionTracks[index];
            if (typeof caption.kind === 'string' && caption.kind == 'asr') {
                return captionTracks[index].baseUrl;
            }
            // ASR – A caption track generated using automatic speech recognition.
            // https://developers.google.com/youtube/v3/docs/captions
        }
    } catch (error) {
        return false;
    }
}

function get_auto_subtitle(callback) {
    var url = get_auto_subtitle_xml_url();
    get_from_url(url, callback);
}

function get_closed_subtitle(lang_code, callback) {
    var url = 'https://video.google.com/timedtext?hl=' + lang_code + '&lang=' + lang_code + '&v=' + get_video_id();
    // example: https://video.google.com/timedtext?hl=en&lang=en&v=FWuwq8HTLQo
    console.log('地址是：' + url);
    get_from_url(url, callback);
}

function get_from_url(url, callback) {
    $.ajax({
        url: url,
        type: 'get',
        success: function (r) {
            callback(r);
        },
        fail: function (error) {
            callback(false);
        }
    });
}

// Youtube return XML. we want SRT  
// input: Youtube XML format
// output: SRT format
function parse_youtube_XML_to_SRT(youtube_xml_string) {
    if (youtube_xml_string === '') {
        return false;
    }
    var text = youtube_xml_string.getElementsByTagName('text');
    var result = '';
    var BOM = '\uFEFF';
    result = BOM + result; // store final SRT result
    var len = text.length;
    for (var i = 0; i < len; i++) {
        var index = i + 1;
        var content = text[i].textContent.toString();
        content = content.replace(/(<([^>]+)>)/ig, ""); // remove all html tag.
        var start = text[i].getAttribute('start');
        var end = '';

        if (i + 1 >= len) {
            end = parseFloat(text[i].getAttribute('start')) + parseFloat(text[i].getAttribute('dur'));
        } else {
            end = text[i + 1].getAttribute('start');
        }

        // we want SRT format:
        /*
            1
            00:00:01,939 --> 00:00:04,350
            everybody Craig Adams here I'm a

            2
            00:00:04,350 --> 00:00:06,720
            filmmaker on YouTube who's digging
        */
        var new_line = "\n";
        // var new_line = "%0D%0A";
        result = result + index + new_line;
        // 1

        var start_time = process_time(parseFloat(start));
        var end_time = process_time(parseFloat(end));
        result = result + start_time;
        result = result + ' --> ';
        result = result + end_time + new_line;
        // 00:00:01,939 --> 00:00:04,350

        result = result + content + new_line + new_line;
        // everybody Craig Adams here I'm a
    }
    return result;
}

// return "English (auto-generated)" or a default name;
function get_auto_subtitle_name(){
    try {
        var raw_string = ytplayer.config.args.player_response;
        var json = JSON.parse(raw_string);

        if (typeof json.captions !== "undefined") {
            var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
            for (var index in captionTracks) {
                var caption = captionTracks[index];
                if (typeof caption.kind === 'string' && caption.kind == 'asr') {
                    return captionTracks[index].name.simpleText;
                }
            }
        }
    } catch (error) {
        return 'Auto Subtitle';
    }
}
