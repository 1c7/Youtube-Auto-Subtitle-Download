// ==UserScript==
// @name        Youtube Auto Subtitle Downloader v12
// @description  download youtube AUTO subtitle (support all auto-generated language, Russian, Japanese, German, French, etc..
// @include      http://www.youtube.com/watch?*
// @include      https://www.youtube.com/watch?*
// @require      http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.9.1.min.js
// @version      12
// @namespace https://greasyfork.org/users/5711
// ==/UserScript==

// Author  : Cheng Zheng
// Email   : guokrfans@gmail.com ( if you get any problem just email me, I am happy to help )
// Github  : https://github.com/1c7

// Test video
// everytime I change the script, I should test following video to make it work properly

// English
// https://www.youtube.com/watch?v=DPFJROWdkQ8   (2 subtitle: English auto-generated + Arabic)
// https://www.youtube.com/watch?v=kkPN55JNQnY   Xbox Elite Wireless Controller - The World's Most Advanced Controller

// German
// https://www.youtube.com/watch?v=2-xbQ7ydHWo   Deutsch Lernen Mit Videos | German Learning Videos | Zu Hause |

// France
// https://www.youtube.com/watch?v=bb4zvZdrMz4    Easy French 1 - à Paris!

// Russian
// https://www.youtube.com/watch?v=JEF1Ro56wIU   Жизнь в Америке?

// ===============================================

// Page first time load
$(document).ready(function(){  init(); });
// Page jump
window.addEventListener('spfdone', function(e) { init(); });

function init(){
    // Put button on page
    $('#eow-title').append('<a id="YT_auto"> == Get (auto-generated) Subtitle | 下载自动字幕 == </a>');

    // Style
    $('#YT_auto').addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip'); // 样式是 Youtube 自带的.
    $("#YT_auto").css('margin-top','2px')
        .css('margin-left','4px')
        .css('border','1px solid rgb(0, 183, 90)')
        .css('cursor','pointer')
        .css('color','rgb(255, 255, 255)')
        .css('border-top-left-radius','3px')
        .css('border-top-right-radius','3px')
        .css('border-bottom-right-radius','3px')
        .css('border-bottom-left-radius','3px')
        .css('background-color','#00B75A');

    var TITLE = unsafeWindow.ytplayer.config.args.title;
    var version = getChromeVersion();

    // use different way to download, dependent on Chrome version
    if (version > 52){
        document.getElementById('YT_auto').setAttribute(
            'download',
            '(auto)' + TITLE + '.srt'
        );
        document.getElementById('YT_auto').setAttribute(
            'href',
            'data:Content-type: text/plain,' + get_subtitle()
        );
    } else {
        $("#YT_auto").click(function(){
            downloadFile(TITLE+".srt",get_subtitle());
        });
    }
}

// basic logic here is:
// 1. get subtitle URL.
// 2. ajax that URL to get subtitle.
// 3. if the URL 404, probably because lang_code wrong.
// 4. try ajax URL again, but this time with 'en' lang_code.
// 5. if it work, then work, if it doesn't, ┑(￣Д ￣)┍
// 6. finally get subtitle & convert to SRT & make it download-able
// 7. smile.
function get_subtitle(){
    var TTS_URL = yt.getConfig("TTS_URL"); // <- if that one not wokring, try: yt.config.get("TTS_URL");
    var data_url = new URL(decodeURIComponent(ytplayer.config.args.caption_tracks).split('u=')[1]);
    var searchParams = new URLSearchParams(data_url.search);
    var lang_code = searchParams.get('lang');
    console.log("Auto Subtitle Download: lang_code is " + lang_code);

    if (!TTS_URL){
        console.log("Auto Subtitle Download: No TTS_URL");
        noAutoSubtitleHint();
        return false;
    }
    // following 2 line is to get a URL, URL is important, is where we get the subtitle from.
    var lang_code_xml = TTS_URL + "&kind=asr&lang="+lang_code+"&fmt=srv1";
    var en_xml = TTS_URL + "&kind=asr&lang=en&fmt=srv1";

    var SRT_subtitle = "<content will be replace>";
    $.ajax({
        url: lang_code_xml,
        type: 'get',
        async: false,
        error: function(r){
          console.log("Auto Subtitle Download: Ajax Error");
          SRT_subtitle = tryAjaxAgainWithENlang_code(en_xml);
        },
        success: function(r) {
          SRT_subtitle = parseYoutubeXMLToSRT(r);
        }
    });
    return SRT_subtitle;
}

// if we can't get English auto-subtitle. there a chance that lang_code is wrong.
// Example: https://www.youtube.com/watch?v=DPFJROWdkQ8
// video got english auto-subtitle. but lang_code is ar, mean Arabic.
// should try again, this time just use "en" as lang_code
function tryAjaxAgainWithENlang_code(en_xml){
  if (en_xml === ''){
    return false;
  }
  var final_result = '';
  $.ajax({
      url: en_xml,
      type: 'get',
      async: false,
      error: function(r){
        noAutoSubtitleHint();
        console.log('Auto Subtitle Download: tryAjaxAgainWithENlang_code Ajax Error');
      },
      success: function(r) {
        final_result = parseYoutubeXMLToSRT(r);
      }
  });
  return final_result;
}

// Youtube return XML. we want SRT,
// so this function input Youtube XML format, output proper SRT format.
function parseYoutubeXMLToSRT(youtube_xml_string){
  if(youtube_xml_string === ""){
    return false;
  }

  var text = youtube_xml_string.getElementsByTagName('text');
  var result = ""; // store final SRT result
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

// if there are no subtitle, tell user that by change text and button style.
function noAutoSubtitleHint(){
  $("#YT_auto").text("No Auto Subtitle | 没有自动字幕");
  $("#YT_auto").css("background-color","rgb(0, 0, 0)").css('border','1px solid rgb(0, 0, 0)');
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
