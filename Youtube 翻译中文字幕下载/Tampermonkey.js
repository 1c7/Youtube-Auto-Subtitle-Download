// ==UserScript==
// @name           Youtube 翻译中文字幕下载 v3
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @copyright      2018-2021 Cheng Zheng;
// @license        GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version        3
// @grant GM_xmlhttpRequest
// @namespace https://greasyfork.org/users/5711
// @description Youtube 播放器右下角有个 Auto-tranlsate，可以把视频字幕翻成中文。这个脚本是下载这个中文字幕
// ==/UserScript==

/*
  作者 : 郑诚
  新浪微博: 糖醋陈皮 https://weibo.com/u/2004104451/home?wvr=5
  邮箱 :  guokrfans@gmail.com

  测试视频：（代码在如下视频中试过，没有发现问题）
  https://www.youtube.com/watch?v=nGlQkaoIfBI   1门语言
  https://www.youtube.com/watch?v=O5nskjZ_GoI   13门语言

  这个脚本有90%和我之前写的下载"完全字幕"的脚本一样：https://greasyfork.org/zh-CN/scripts/5368-youtube-subtitle-downloader-v14
  这个只是把获取字幕地址的部分做了修改，拿到了翻译后的中文字幕地址。
*/

// CONFIG
var NO_SUBTITLE = 'No captions.';
var HAVE_SUBTITLE = '下载中文字幕';
var first_load = true;

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

// trigger when first load (hit refresh button)
$(document).ready(function () {
  // because document ready still not enough
  // it's still too early, we have to wait certain element exist, then execute function.
  if (new_material_design_version()) {
    var material_checkExist = setInterval(function () {
      if (document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer').length) {
        init();
        clearInterval(material_checkExist);
      }
    }, 330);
  } else {
    var checkExist = setInterval(function () {
      if ($('#watch7-headline').length) {
        init();
        clearInterval(checkExist);
      }
    }, 330);
  }

});

// trigger when loading new page (actually this would also trigger when first loading, that's not what we want, that's why we need to use firsr_load === false)
// (new Material design version would trigger this "yt-navigate-finish" event. old version would not.)
var body = document.getElementsByTagName("body")[0];
body.addEventListener("yt-navigate-finish", function (event) {
  if (first_load === false) {
    remove_subtitle_download_button();
    init();
  }
});

// trigger when loading new page
// (old version would trigger this "spfdone" event. new Material design version not sure yet.)
window.addEventListener("spfdone", function (e) {
  if (current_page_is_video_page()) {
    remove_subtitle_download_button();
    var checkExist = setInterval(function () {
      if ($('#watch7-headline').length) {
        init();
        clearInterval(checkExist);
      }
    }, 330);
  }

});

// return true / false
function current_page_is_video_page() {
  return get_video_id() !== null;
}

// return string like "RW1ChiWyiZQ",  from "https://www.youtube.com/watch?v=RW1ChiWyiZQ"
// or null
function get_video_id() {
  return getURLParameter('v');
}

//https://stackoverflow.com/questions/11582512/how-to-get-url-parameters-with-javascript/11582513#11582513
function getURLParameter(name) {
  return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function remove_subtitle_download_button() {
  $('#youtube-subtitle-downloader-by-1c7').remove();
}

function init() {
  unsafeWindow.caption_array = [];
  inject_our_script();
  first_load = false;
}

function inject_our_script() {
  var div = document.createElement('div'),
    select = document.createElement('select'),
    option = document.createElement('option'),
    controls = document.getElementById('watch7-headline'); // Youtube video title DIV

  if (new_material_design_version()) {
    div.setAttribute('style', `display: table;
margin-top:4px;
border: 1px solid rgb(0, 183, 90);
cursor: pointer; color: rgb(255, 255, 255);
border-top-left-radius: 3px;
border-top-right-radius: 3px;
border-bottom-right-radius: 3px;
border-bottom-left-radius: 3px;
background-color: #00B75A;
padding: 4px;
padding-right: 8px;
`);
  } else {
    div.setAttribute('style', `display: table;
margin-top:4px;
border: 1px solid rgb(0, 183, 90);
cursor: pointer; color: rgb(255, 255, 255);
border-top-left-radius: 3px;
border-top-right-radius: 3px;
border-bottom-right-radius: 3px;
border-bottom-left-radius: 3px;
background-color: #00B75A;
padding: 3px;
padding-right: 8px;
`);
  }

  div.id = 'youtube-subtitle-downloader-by-1c7';

  select.id = 'captions_selector';
  select.disabled = true;
  select.setAttribute('style', 'display:block; border: 1px solid rgb(0, 183, 90); cursor: pointer; color: rgb(255, 255, 255); background-color: #00B75A;');

  option.textContent = '载入中...';
  option.selected = true;
  select.appendChild(option);

  // 下拉菜单中选择后的事件侦听
  select.addEventListener('change', function () {
    download_subtitle(this);
  }, false);

  div.appendChild(select);
  // put <select> into <div>

  // put the div into page: new material design
  var title_element = document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer');
  if (title_element) {
    $(title_element[0]).after(div);
  }
  // put the div into page: old version
  if (controls) {
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

// Input: 语言代码（代表要从哪个语言转成中文）
// Ouput: 字幕的 URL，或者 false（找不到的话）
function get_chinese_subtitle_url(from_language_code) {
  var raw_string = ytplayer.config.args.player_response;
  var json = JSON.parse(raw_string);
  var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
  // 有多少种语言，captionTracks 就有多少个数组。

  // 从 captionTracks 里面用 loop 来搜索对应语言。返回 baseUrl。
  var baseURL = '';
  for (var index in captionTracks) {
    var caption = captionTracks[index];
    if (caption.languageCode === from_language_code) {
      baseURL = captionTracks[index].baseUrl;
    }
  }
  if (baseURL == '') {
    return false; // 上面的 loop 要是没找到对应的语言，导致 url 是空，那也只能返回  false
  }
  var chinese_subtitle_url = baseURL + "&tlang=zh-Hans"; // 转成中文字幕
  return chinese_subtitle_url;
}

function download_subtitle(selector) {
  var caption = caption_array[selector.selectedIndex - 1];
  if (!caption) return;
  var language_name_1c7 = caption.lang_name;
  var from_language_code = caption.lang_code;
  var url = get_chinese_subtitle_url(from_language_code);
  jQuery.get(url).done(function (r) {
    // format should look like this: (2018-2-10)
    // youtube change their format from time to time. I already change my code to fit their new format twice
    /*
    <transcript>
<text start="54" dur="3">My name is Derpy Hooves</text>
<text start="57" dur="3">I am a simple pegasus pony from Ponyville</text>
<text start="65" dur="5">
However, there is something about me that you must know
</text>
<text start="78" dur="5">
I have strabismus, meaning that my eyes are not properly aligned with each others
</text>
<text start="113" dur="2">My problem was neurological</text>
<text start="115" dur="3">
The doctors couldn&#39;t do anything to ... correct the problem
</text>
<text start="122" dur="3">It&#39;s not only with my vision</text>
<text start="125" dur="3">It&#39;s also affecting the front of my body</text>
<text start="128" dur="2">Giving me my &quot;Derpy Hooves&quot;</text>
<text start="130" dur="5">
My clumsiness is so important it was represented by my cutie mark
</text>
<text start="135" dur="4">Seven bubbles representing luck and fragility</text>
<text start="139" dur="2">They joked about the way I acted</text>
<text start="141" dur="4">Saying that I was just stupid and silly</text>
<text start="145" dur="2">This was not my fault</text>
<text start="147" dur="3">
This was the way I was and I couldn&#39;t do anything about it
</text>
<text start="158" dur="2">I wished to get my body fixed</text>
<text start="160" dur="2">Later I realised this was not what I really wanted</text>
<text start="162" dur="3">I wanted respect, and I had to earn it by mysel</text>
<text start="196" dur="4">
Despite being a great flyer raised by a former Wonderbolts member
</text>
<text start="200" dur="2">I couldn&#39;t join them because</text>
<text start="202" dur="2">They didn&#39;t trust my impaired vision</text>
<text start="213" dur="2">Instead, I used my silly eyes as an advantage</text>
<text start="215" dur="3">And became one of the best mailmares in Ponyville</text>
<text start="260" dur="3">
I know I will have to live with this for the rest of my life
</text>
<text start="263" dur="2">But I don&#39;t really mind anymore</text>
<text start="265" dur="4">
My best memories are the voices of my friends and my familly, I don&#39;t need perfect vision to be happy
</text>
<text start="273" dur="3">I might be unable to walk correctly either</text>
<text start="276" dur="2">But I still got my wings, and I will live with it</text>
<text start="327" dur="4">
And I won&#39;t allow you to blind those who are important to me
</text>
</transcript>



sometime it's different:
https://video.google.com/timedtext?hl=en&lang=en&name=&v=a8uyilHatBA
<transcript>
<text start="0.07" dur="3.569">
About a year ago, Elon Musk was sitting in traffic in Los Angeles, and thought about
</text>
<text start="3.639" dur="2.971">
how cool it would be if he built a tunnel under the city.
</text>
<text start="6.61" dur="1.21">So he built a tunnel under the city.</text>
<text start="7.82" dur="2.279">And he started selling hats for his tunnel.</text>
<text start="10.099" dur="3.931">
50,000 hats later, he got bored with hats, and switched the hats out for flamethrowers.
</text>
<text start="14.03" dur="3.999">
He sold 20,000 of those, and then five days later he tied his car up to the most powerful
</text>
<text start="18.029" dur="3.431">rocket ever made, and shot it into fuckin space.</text>
<text start="23.1" dur="2.44">And then the rocket fuckin landed itself.</text>
</transcript>
    */
    console.log('输出结果');
    console.log(r);
    var text = r.getElementsByTagName('text');
    // 拿所有 text 节点
    var result = "";
    var BOM = "\uFEFF";
    result = BOM + result;
    // 保存结果的字符串
    for (var i = 0; i < text.length; i++) {
      var index = i + 1;
      // 这个是字幕的索引, 从1开始的, 但是因为我们的循环是从0开始的, 所以加个1
      var content = text[i].textContent.replace(/\n/g, " ");
      // content 保存的是字幕内容 - 这里把换行换成了空格, 因为 Youtube 显示的多行字幕中间会有个\n, 如果不加这个replace. 两行的内容就会黏在一起.
      var start = parseFloat(text[i].getAttribute('start'));
      var end = start + parseFloat(text[i].getAttribute('dur'));
      if (!end) {
        end = start + 5;
      }
      // ==== 开始处理数据, 把数据保存到result里. ====
      result = result + index + escape('\r\n');
      // 把序号加进去
      var start_time = process_time(parseFloat(start));
      result = result + start_time;
      // 拿到 开始时间 之后往result字符串里存一下
      result = result + ' --> ';
      // 标准srt时间轴: 00:00:01,850 --> 00:00:02,720
      // 我们现在加个中间的箭头..
      var end_time = process_time(parseFloat(end));
      result = result + end_time + escape('\r\n');
      // 拿到 结束时间 之后往result字符串里存一下
      result = result + content + escape('\r\n\r\n');
      // 加字幕内容
    }
    var title = get_file_name(language_name_1c7);
    downloadFile(title, result);
    // 下载

  }).fail(function () {
    alert("Error: No response from server.");
  });

  selector.options[0].selected = true;
  // 下载后把 <select> 选回第一个元素.
}


// Return something like: "(English)How Did Python Become A Data Science Powerhouse?.srt"
function get_file_name(language_name) {
  return '(' + language_name + ' 转中文)' + unsafeWindow.ytplayer.config.args.title + '.srt';
}

// 载入有多少种语言, 然后加到 <select> 里
function load_language_list(select) {
  GM_xmlhttpRequest({
    method: 'GET',
    url: 'https://video.google.com/timedtext?hl=en&v=' + get_video_id() + '&type=list',
    onload: function (xhr) {
      var caption, option, caption_info,
        captions = new DOMParser().parseFromString(xhr.responseText, "text/xml").getElementsByTagName('track');
      if (captions.length === 0) {
        select.options[0].textContent = NO_SUBTITLE;

        if (new_material_design_version()) {
          $('#youtube-subtitle-downloader-by-1c7').css('border', '#95a5a6').css('cursor', 'not-allowed').css('background-color', '#95a5a6').css('padding', '6px');
          $('#captions_selector').css('border', '#95a5a6').css('cursor', 'not-allowed').css('background-color', '#95a5a6');

        } else {
          $('#youtube-subtitle-downloader-by-1c7').css('border', '#95a5a6').css('cursor', 'not-allowed').css('background-color', '#95a5a6').css('padding', '5px');
          $('#captions_selector').css('border', '#95a5a6').css('cursor', 'not-allowed').css('background-color', '#95a5a6');
        }

        return false;
      }
      for (var i = 0, il = captions.length; i < il; i++) {
        caption = captions[i];
        option = document.createElement('option');
        caption_info = {
          name: caption.getAttribute('name'),
          lang_code: caption.getAttribute('lang_code'),
          lang_name: caption.getAttribute('lang_translated')
        };
        caption_array.push(caption_info);
        // 注意这里是加到 caption_array, 一个全局变量, 我们待会要依靠它来下载.
        option.textContent = caption_info.lang_name + " -> 翻译成中字";
        select.appendChild(option);
      }
      select.options[0].textContent = HAVE_SUBTITLE;
      select.disabled = false;
    }
  });
}

// 处理时间. 比如 start="671.33"  start="37.64"  start="12" start="23.029"
// 处理成 srt 时间, 比如 00:00:00,090    00:00:08,460    00:10:29,350
function process_time(s) {
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
  var Second = array[0]; // 671
  var MilliSecond = array[1]; // 330
  // 先声明下变量, 待会把这几个拼好就行了

  // 我们来处理秒数.  把"分钟"和"小时"除出来
  if (Second >= 60) {
    Minute = Math.floor(Second / 60);
    Second = Second - Minute * 60;
    // 把 秒 拆成 分钟和秒, 比如121秒, 拆成2分钟1秒

    Hour = Math.floor(Minute / 60);
    Minute = Minute - Hour * 60;
    // 把 分钟 拆成 小时和分钟, 比如700分钟, 拆成11小时40分钟
  }
  // 分钟，如果位数不够两位就变成两位，下面两个if语句的作用也是一样。
  if (Minute < 10) {
    Minute = '0' + Minute;
  }
  // 小时
  if (Hour < 10) {
    Hour = '0' + Hour;
  }
  // 秒
  if (Second < 10) {
    Second = '0' + Second;
  }
  return Hour + ':' + Minute + ':' + Second + ',' + MilliSecond;
}

function downloadFile(fileName, content) {
  var TITLE = unsafeWindow.ytplayer.config.args.title; // Video title
  var version = getChromeVersion();

  // dummy element for download
  if ($('#youtube-subtitle-downloader-dummy-element-for-download').length > 0) {} else {
    $("body").append('<a id="youtube-subtitle-downloader-dummy-element-for-download"></a>');
  }
  var dummy = $('#youtube-subtitle-downloader-dummy-element-for-download');

  // 判断 Chrome 版本选择下载方法，Chrome 52 和 53 的文件下载方式不一样
  if (version > 52) {
    dummy.attr('download', fileName);
    dummy.attr('href', 'data:Content-type: text/plain,' + htmlDecode(content));
    dummy[0].click();
  } else {
    downloadViaBlob(fileName, htmlDecode(content));
  }
}

// 复制自： http://www.alloyteam.com/2014/01/use-js-file-download/
// Chrome 53 之后这个函数失效。52有效。
function downloadViaBlob(fileName, content) {
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

// https://css-tricks.com/snippets/javascript/unescape-html-in-js/
// turn HTML entity back to text, example: &quot; should be "
function htmlDecode(input) {
  var e = document.createElement('div');
  e.class = 'dummy-element-for-tampermonkey-Youtube-Subtitle-Downloader-script-to-decode-html-entity';
  e.innerHTML = input;
  return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
}