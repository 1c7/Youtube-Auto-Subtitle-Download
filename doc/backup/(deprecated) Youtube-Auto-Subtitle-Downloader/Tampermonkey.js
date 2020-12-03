// ==UserScript==
// @name        Youtube Auto Subtitle Downloader v15
// @description  download youtube AUTO subtitle (v15 support new Material Design, v14 support all language)
// @include      https://*youtube.com/*
// @require      http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.9.1.min.js
// @version      15
// @namespace https://greasyfork.org/users/5711
// ==/UserScript==

// Author  : Cheng Zheng
// Email   : guokrfans@gmail.com ( if you get any problem just email me, I am happy to help )
// Github  : https://github.com/1c7
// Blog    : http://1c7.me

// Test video
// everytime I change the script, I would test following video to make sure it work properly

// English
// https://www.youtube.com/watch?v=DPFJROWdkQ8
// (2 subtitle: English auto-generated + Arabic)
// https://www.youtube.com/watch?v=kkPN55JNQnY
// Xbox Elite Wireless Controller - The World's Most Advanced Controller

// German
// https://www.youtube.com/watch?v=2-xbQ7ydHWo
// Deutsch Lernen Mit Videos | German Learning Videos | Zu Hause |

// France
// https://www.youtube.com/watch?v=bb4zvZdrMz4
// Easy French 1 - à Paris!

// Russian
// https://www.youtube.com/watch?v=JEF1Ro56wIU
// Жизнь в Америке?

// ===============================================

// CONFIG
var NO_SUBTITLE = 'No (auto-generated) subtitle';

// important initial variable, don't change it unless you know what you are doing.
var first_load = true;
var youtube_playerResponse_1c7 = null;
var auto_subtitle_language_name = '';

// trigger when first load (hit refresh button)
$(document).ready(function(){
    // because document ready still not enough
    // it's still too early, we have to wait certain element exist, then execute function.
    if(new_material_design_version()){
        var material_checkExist = setInterval(function() {
            if (document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer').length) {
                init();
                clearInterval(material_checkExist);
            }
        }, 330);
    } else {
        var checkExist = setInterval(function() {
            if ($('#watch-headline-title').length && $('#YT_auto').length === 0) {
                init();
                clearInterval(checkExist);
            }
        }, 330);
    }

});

// trigger when loading new page (actually this would also trigger when first loading, that's not what we want, that's why we need to use firsr_load === false)
// (new Material design version would trigger this "yt-navigate-finish" event. old version would not.)
var body = document.getElementsByTagName("body")[0];
body.addEventListener("yt-navigate-finish", function(event) {
    if (current_page_is_video_page() === false){
        return;
    }
    youtube_playerResponse_1c7 = event.detail.response.playerResponse; // Youtube stuff
    console.log(youtube_playerResponse_1c7);
    if(first_load === false){
        remove_subtitle_download_button();
        init();
    }
}, false);

// trigger when loading new page
// (old version would trigger this "spfdone" event. new Material design version not sure yet.)
window.addEventListener("spfdone", function(e) {
    if (current_page_is_video_page() === false){
        return;
    }
    if(current_page_is_video_page()){
        remove_subtitle_download_button();
        var checkExist = setInterval(function() {
            if ($('#watch7-headline').length && $('#YT_auto').length === 0) {
                init();
                clearInterval(checkExist);
            }
        }, 330);
    }

});


// return true / false
// Detect [new version UI(material design)] OR [old version UI]
function new_material_design_version(){
    var old_title_element = document.getElementById('watch7-headline');
    if(old_title_element){
        return false;
    } else {
        return true;
    }
}

// return true / false
function auto_subtitle_exist(){
    return typeof get_auto_subtitle_name() === 'string';
}

// https://stackoverflow.com/questions/23808928/javascript-elegant-way-to-check-nested-object-properties-for-null-undefined
function get(obj, key) {
    return key.split(".").reduce(function(o, x) {
        return (typeof o == "undefined" || o === null) ? o : o[x];
    }, obj);
}

// return "English (auto-generated)" or null;
function get_auto_subtitle_name(){
    var json = '';
    if(new_material_design_version()){
        json = youtube_playerResponse_1c7;
        if(json === null){
            return null;
        }
    } else {
        var raw_string = ytplayer.config.args.player_response;
        try{
            json = JSON.parse(raw_string);
        }catch(e){
            return null;
        }
    }
    // if we can't get into that deep level, just return null;
    if(get(json, 'captions.playerCaptionsTracklistRenderer.captionTracks') === undefined){
        return null;
    }
    var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
    for (var index in captionTracks){
        var caption = captionTracks[index];
        if(typeof caption.kind === 'string' && caption.kind == 'asr'){
            return captionTracks[index].name.simpleText;
        }
    }
    return null;
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
    $('#YT_auto').remove();
}

function no_subtitle_button(){
    if(new_material_design_version()){
        var title_element = document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer');
        if (title_element){
            $(title_element[0]).after('<a id="YT_auto">' + NO_SUBTITLE + '</a>');
        }
        $('#YT_auto').addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip'); // 样式是 Youtube 自带的.
        $("#YT_auto").css('margin-top','2px')
            .css('position','relative')
            .css('top','-3px')
            .css('margin-right','6px')
            .css('padding','7px')
            .css('padding-right','12px')
            .css('padding-left','12px')
            .css('text-decoration','none')
            .css('border','1px solid #95a5a6')
            .css('cursor','not-allowed')
            .css('color','rgb(255, 255, 255)')
            .css('border-top-left-radius','3px')
            .css('border-top-right-radius','3px')
            .css('border-bottom-right-radius','3px')
            .css('border-bottom-left-radius','3px')
            .css('background-color','#95a5a6')
            .css('display','inline-block');
    } else {
        $('#watch-headline-title').after('<a id="YT_auto">' + NO_SUBTITLE + '</a>');
        $('#YT_auto').addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip'); // 样式是 Youtube 自带的.
        $("#YT_auto")
            .css('padding','6px 12px')
            .css('border','1px solid #95a5a6')
            .css('cursor','not-allowed')
            .css('color','rgb(255, 255, 255)')
            .css('border-top-left-radius','3px')
            .css('border-top-right-radius','3px')
            .css('border-bottom-right-radius','3px')
            .css('border-bottom-left-radius','3px')
            .css('background-color','#95a5a6')
            .css('display','inline-block')
            .css('padding','5px 12px')
            .css('font-weight','normal')
            .css('font-size','13px');
    }
}

function normal_subtitle_button(){
    if(new_material_design_version()){
        var title_element = document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer');
        if (title_element){
            $(title_element[0]).after('<a id="YT_auto">' + 'Download "' + auto_subtitle_language_name + '"</a>');
        }
        $("#YT_auto").css('margin-top','2px')
            .css('position','relative')
            .css('top','-3px')
            .css('margin-right','6px')
            .css('padding','7px')
            .css('padding-right','12px')
            .css('padding-left','12px')
            .css('text-decoration','none')
            .css('border','1px solid rgb(0, 183, 90)')
            .css('cursor','pointer')
            .css('color','rgb(255, 255, 255)')
            .css('border-top-left-radius','3px')
            .css('border-top-right-radius','3px')
            .css('border-bottom-right-radius','3px')
            .css('border-bottom-left-radius','3px')
            .css('background-color','#00B75A')
            .css('display','inline-block');
    } else {
        $('#watch-headline-title').after('<a id="YT_auto">' + 'Download "' + auto_subtitle_language_name + '"</a>');
        $('#YT_auto').addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip'); // 样式是 Youtube 自带的.
        $("#YT_auto").css('margin-top','4px')
            .css('padding-top','2px')
            .css('border','1px solid rgb(0, 183, 90)')
            .css('cursor','pointer')
            .css('color','rgb(255, 255, 255)')
            .css('border-top-left-radius','3px')
            .css('border-top-right-radius','3px')
            .css('border-bottom-right-radius','3px')
            .css('border-bottom-left-radius','3px')
            .css('background-color','#00B75A')
            .css('display','inline-block')
            .css('padding','5px 12px')
            .css('font-weight','normal')
            .css('font-size','13px');
    }
}

function init(){
    first_load = false;
    if (auto_subtitle_exist()){
        auto_subtitle_language_name = get_auto_subtitle_name();
        normal_subtitle_button();
        var button_element = $("#YT_auto");
        if (getChromeVersion() > 52){
            button_element.attr('download', get_file_name());
            button_element.attr('href', 'data:Content-type: text/plain,' + get_subtitle());
        } else {
            button_element.click(function(){ downloadFile(get_file_name(), get_subtitle()); });
        }
    } else {
        // if there are no (auto-generated), we just put a button on page, tell user there are no subtitle.
        no_subtitle_button();
        return;
    }
}

// return a URL address or null;
// later we can send a AJAX and get XML subtitle response
function get_auto_subtitle_xml_url(){
    // use data from different souce
    var json = '';
    if(youtube_playerResponse_1c7 !== null && youtube_playerResponse_1c7 !== "" && youtube_playerResponse_1c7 !== undefined){
        json = youtube_playerResponse_1c7;
    } else {
        var raw_string = ytplayer.config.args.player_response;
        json = JSON.parse(raw_string);
    }
    var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
    for (var index in captionTracks){
        var caption = captionTracks[index];
        if(typeof caption.kind === 'string' && caption.kind == 'asr'){
            return captionTracks[index].baseUrl;
        }
        // ASR – A caption track generated using automatic speech recognition.
        // https://developers.google.com/youtube/v3/docs/captions
    }
    return null;
}

function get_subtitle(){
    var ajax_url = get_auto_subtitle_xml_url();
    if(ajax_url === null){
        // hint: no auto subtitle;
        console.log('can not get auto subtitle xml URL');
        return false;
    }
    var SRT_subtitle = "<content will be replace>";
    $.ajax({
        url: ajax_url, //for debug comment: lang_code_url
        type: 'get',
        async: false,
        error: function(r){
            console.log("Auto Subtitle Download: Ajax Error");
        },
        success: function(r) {
            SRT_subtitle = parseYoutubeXMLToSRT(r);
        }
    });
    return SRT_subtitle;
}

// Youtube return XML. we want SRT,
// so this function input Youtube XML format, output proper SRT format.
function parseYoutubeXMLToSRT(youtube_xml_string){
    if(youtube_xml_string === ""){
        return false;
    }
    var text = youtube_xml_string.getElementsByTagName('text');
    var result = "";
    var BOM = "\uFEFF";
    result = BOM + result; // store final SRT result
    var len = text.length;
    for(var i=0; i<len; i++){
        var index = i+1;
        var content = text[i].textContent.toString();
        content = content.replace(/(<([^>]+)>)/ig, ""); // remove all html tag.
        var start = text[i].getAttribute('start');
        var end = "";

        if (i+1 >= len){
            end = parseFloat(text[i].getAttribute('start')) + parseFloat(text[i].getAttribute('dur'));
        }else{
            end = text[i+1].getAttribute('start');
        }

        // ==== 开始处理数据, 把数据保存到result里. ====
        var new_line = "%0D%0A";
        result = result + index + new_line;
        // SRT index

        var start_time = process_time( parseFloat(start) );
        result = result + start_time;
        // 拿到 开始时间 后往 result 里存

        result = result + ' --> ';
        // 标准 srt 时间轴: 00:00:01,850 --> 00:00:02,720
        // 现在加中间的箭头

        var end_time = process_time( parseFloat(end) );
        result = result + end_time + new_line;
        // 拿到 结束时间 后往 result 里存

        result = result + content + new_line + new_line;
        // 加字幕内容
    }
    // ==== srt字幕我们已经完全处理好了, 保存在result里了, 我们现在保存到用户的电脑里就行了. ====
    // 保存javascript字符到用户电脑里
    result = result.replace(/(<div><br>)*<\/div>/g, '\n');
    result = result.replace(/<div>/g, '');
    /* replaces some html entities */
    result = result.replace(/&nbsp;/g, ' ');
    result = result.replace(/&amp;/g, '&');
    result = result.replace(/&lt;/g, '<');
    result = result.replace(/&gt;/g, '>');
    result = result.replace(/&#39;/g, "'");
    return result;
}

// Copy from: http://www.alloyteam.com/2014/01/use-js-file-download/
// Chrome 53 之后这个函数失效. 52有效.
function downloadFile(fileName, content){
    var aLink = document.createElement('a');
    var blob = new Blob([content]);
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("click", false, false);
    aLink.download = fileName;
    aLink.href = URL.createObjectURL(blob);
    aLink.dispatchEvent(evt);
}

//http://stackoverflow.com/questions/4900436/how-to-detect-the-installed-chrome-version
function getChromeVersion() {
    var raw = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
    return raw ? parseInt(raw[2], 10) : false;
}

// Convert Time Format
// Example: start="671.33"  start="37.64"  start="12" start="23.029"
// turn to SRT time format, like: 00:00:00,090    00:00:08,460    00:10:29,350
// from this format: 671.33
//   to this format: 00:10:29,350
// (easy task, Youtube return only second,
// we just use some division to get Hours & Minute and put them back all together)
function process_time(s){
    // s mean second
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
    // Minute，如果位数不够两位就变成两位，下面两个if语句的作用也是一样。
    if (Minute < 10){
        Minute = '0' + Minute;
    }
    // Hour
    if (Hour < 10){
        Hour = '0' + Hour;
    }
    // Second
    if (Second < 10){
        Second = '0' + Second;
    }
    return Hour + ':' + Minute + ':' + Second + ',' + MilliSecond;
}

// Return something like: "(auto)Screenplays Crash Course Film Production #1.srt"
function get_file_name(){
    if(new_material_design_version()){
        var video_name = "";
        if(first_load){
            var title_element = document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer');
            video_name = title_element[0].childNodes[0].data;
        }else{
            video_name = youtube_playerResponse_1c7.videoDetails.title;
        }
        return get_auto_subtitle_name() + video_name + '.srt';
    } else {
        var TITLE = unsafeWindow.ytplayer.config.args.title;
        return get_auto_subtitle_name() + TITLE + '.srt';
    }
}
