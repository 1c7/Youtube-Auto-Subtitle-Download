// ==UserScript==
// @name           Youtube 双语字幕下载 v6 (中文+任选的一门双语,比如英语) 
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @require        https://code.jquery.com/jquery-1.12.4.min.js
// @version        6
// @copyright      2020 Cheng Zheng
// @grant GM_xmlhttpRequest
// @description   字幕格式是 "中文 \n 英语"（\n 是换行符的意思）
// @namespace  https://greasyfork.org/users/5711
// ==/UserScript==

/*
  作者联系方式:
    QQ 1003211008
    邮件 guokrfans@gmail.com
    Github@1c7

  使用场景:
    此文件仅针对于 Tampermonkey (Chrome 上的一款插件)
    需要安装在 Tampermonkey 里

  解决什么问题：
    下载中外双语的字幕，格式是 中文 \n 外语, \n 是换行符的意思
  
  术语说明：
    auto 自动字幕
    closed 完整字幕 (或者叫人工字幕也可以)

  原理说明: 
    对于"完整字幕", Youtube 返回的时间轴完全一致，因此只需要结合在一起即可，相对比较简单。
    对于"自动字幕"，中文是一个个句子，英文是一个个单词，格式不同，时间轴也不同
    因此，会基于中文的句子时间（时间轴），把英文放进去
*/
(function () {

  // Config
  var NO_SUBTITLE = '无字幕';
  var HAVE_SUBTITLE = '下载双语字幕 (中文+外语)';
  const NEW_LINE = '\n'
  const BUTTON_ID = 'youtube-dual-lang-downloader-by-1c7-last-update-2020-12-3'
  // Config

  var HASH_BUTTON_ID = `#${BUTTON_ID}`

  // initialize
  var first_load = true; // indicate if first load this webpage or not
  var youtube_playerResponse_1c7 = null; // for auto subtitle
  unsafeWindow.caption_array = []; // store all subtitle

  // trigger when first load
  $(document).ready(function () {
    start();
  });

  // Explain this function: we repeatly try if certain HTML element exist, 
  // if it does, we call init()
  // if it doesn't, stop trying after certain time
  function start() {
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
  body.addEventListener("yt-navigate-finish", function (event) {
    if (current_page_is_video_page() === false) {
      return;
    }
    youtube_playerResponse_1c7 = event.detail.response.playerResponse; // for auto subtitle
    unsafeWindow.caption_array = []; // clean up (important, otherwise would have more and more item and cause error)

    // if use click to another page, init again to get correct subtitle
    if (first_load === false) {
      remove_subtitle_download_button();
      init();
    }
  });

  // trigger when loading new page
  // (old version would trigger "spfdone" event. new Material design version not sure yet.)
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
    $(HASH_BUTTON_ID).remove();
  }

  function init() {
    inject_our_script();
    first_load = false;
  }

  function inject_our_script() {
    var div = document.createElement('div'),
      select = document.createElement('select'),
      option = document.createElement('option'),
      controls = document.getElementById('watch7-headline'); // Youtube video title DIV

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

    div.id = BUTTON_ID;
    div.title = 'Youtube Subtitle Downloader'; // display when cursor hover

    select.id = 'captions_selector';
    select.disabled = true;
    select.setAttribute('style', `display:block; 
border: 1px solid rgb(0, 183, 90); 
cursor: pointer; 
color: rgb(255, 255, 255); 
background-color: #00B75A;
padding: 4px;
`);

    option.textContent = 'Loading...';
    option.selected = true;
    select.appendChild(option);

    // 下拉菜单里，选择一项后触发下载
    select.addEventListener('change', function () {
      download_subtitle(this);
    }, false);

    div.appendChild(select); // put <select> into <div>

    // Put the div into page: new material design
    var title_element = document.querySelectorAll('.title.style-scope.ytd-video-primary-info-renderer');
    if (title_element) {
      $(title_element[0]).after(div);
    }
    // Put the div into page: old version
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


  // 输入: url (String)
  // 输出: SRT (Array)
  async function auto_sub_in_chinese_fmt_json3_to_srt(url) {
    var srt_array = []

    var json = await get(url);
    var events = json.events;
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      var tStartMs = event.tStartMs
      var dDurationMs = event.dDurationMs
      var segs = event.segs
      var text = segs[0].utf8;

      var item = {
        startTime: ms_to_srt(tStartMs),
        endTime: ms_to_srt(tStartMs + dDurationMs),
        text: text,

        tStartMs: tStartMs,
        dDurationMs: dDurationMs,
      }
      srt_array.push(item);
    }
    return srt_array
  }

  //原有的有问题的匹配代码，提出方法
  function match_srt_old(en_auto_sub, cn_srt) {
    // 3. 处理英文，插入到句子里, 也就是插入到 cn_srt 的每个元素里（新加一个属性叫 words)
    var events = en_auto_sub.events;
    for (let i = 0; i < events.length; i++) { // loop events
      let event = events[i];
      if (event.aAppend == 1) { // 这样的元素内部只有一个换行符，对我们没有意义，跳过
        continue
      }
      var segs = event.segs
      if (segs == undefined) { // 这样的元素也没意义，跳过
        continue
      }
      var tStartMs = event.tStartMs
      var dDurationMs = event.dDurationMs

      for (let j = 0; j < segs.length; j++) { // loop segs
        const seg = segs[j];
        var word = seg.utf8 // 词的内容

        var word_offset = seg.tOffsetMs === undefined ? 0 : seg.tOffsetMs;
        var word_start_time = tStartMs + word_offset // 词的开始时间

        for (let z = 0; z < cn_srt.length; z++) { // loop each word and put into cn_srt
          const srt_line = cn_srt[z];
          var line_start_time_ms = srt_line.tStartMs
          var line_end_time_ms = srt_line.tStartMs + dDurationMs

          // 如果词的开始时间，刚好处于这个句子的 [开始时间, 结束时间] 区间之内
          if (word_start_time >= line_start_time_ms && word_start_time <= line_end_time_ms) {
            // push 到 words 数组里
            if (cn_srt[z].words === undefined) {
              cn_srt[z].words = [word]
            } else {
              var final_word = ` ${word.trim()}` // 去掉单词本身的空格（不管有没有）然后给单词前面加一个空格
              cn_srt[z].words.push(final_word)
            }
          }
        }
      }
    }
  }

  function process_word(word) {
    w = word.trim()
    return w
  }

  function process_segs(segs, event) {
    if (!event['segs']) {
        return
    }
    for (var i = 0; i < event['segs'].length; i++) {
        var seg = event['segs'][i]
        var word = process_word(seg['utf8'])
        if (word) {
            segs.push(word)
        }
    }
  }

  function fmt_segs(segs) {
    ret = []
    for (var i = 0; i < segs.length; i++) {
        if (i == 0) {
            ret.push(segs[i])
        } else {
            ret.push(" " + segs[i])
        }
    }
    return ret
  }

  function match_srt_new(en_auto_sub, cn_srt) {
    var events = en_auto_sub.events
    if (cn_srt.length == 0 || events.length == 0) {
        return
    }
    var cn_i = 0
    var segs = []
    var en_i = 0
    for (; en_i < events.length; en_i++) { // loop en events
        var event = events[en_i]
        var tStartMs = event.tStartMs
        var dDurationMs = event.dDurationMs
        if (tStartMs == cn_srt[cn_i].tStartMs && dDurationMs == cn_srt[cn_i].dDurationMs) {
            if (cn_i > 0) {
                cn_srt[cn_i-1].words = fmt_segs([...segs])
                segs = []
            }
            cn_i++
            if (cn_i == cn_srt.length) { //到达最后一个元素
                break
            }
        }
        process_segs(segs, event)
    }
    //process last sentence
    segs = []
    for (; en_i < events.length; en_i++) { 
        var event = events[en_i]
        process_segs(segs, event)
    }
    cn_srt[cn_i-1].words = fmt_segs(segs)
  }

  // 下载自动字幕的中英双语
  // 输入: file_name: 保存的文件名
  // 输出: 无 (会触发浏览器下载一个文件)
  async function download_auto_subtitle(file_name) {
    // 1. English Auto Sub in json3 format
    var auto_sub_url = get_auto_subtitle_xml_url();
    var format_json3_url = auto_sub_url + '&fmt=json3'
    var en_auto_sub = await get(format_json3_url); // 格式参考 Youtube-Subtitle-Downloader/fmt=json3/en.json

    // 2. 自动字幕的翻译中文
    var cn_url = format_json3_url + '&tlang=zh-Hans'
    var cn_srt = await auto_sub_in_chinese_fmt_json3_to_srt(cn_url) // 格式参考 Youtube-Subtitle-Downloader/fmt=json3/zh-Hans.json

    // match_srt_old(en_auto_sub, cn_srt)
    match_srt_new(en_auto_sub, cn_srt) //新的匹配方法

    var srt_string = auto_sub_dual_language_to_srt(cn_srt) // 结合中文和英文
    downloadString(srt_string, "text/plain", file_name);
  }

  function auto_sub_dual_language_to_srt(srt_array) {
    // var srt_array_item_example = {
    //   "startTime": "00:00:06,640",
    //   "endTime": "00:00:09,760",
    //   "text": "在与朋友的长时间交谈中以及与陌生人的简短交谈中",
    //   "tStartMs": 6640,
    //   "dDurationMs": 3120,
    //   "words": ["in", " a", " long", " conversation", " with", " a", " friend", " and", "a", " short", " chat", " with", " a", " stranger", "the", " endless", " streams"]
    // }

    var result_array = []
    for (let i = 0; i < srt_array.length; i++) {
      const line = srt_array[i];
      var text = line.text + NEW_LINE + line.words.join(''); // 中文 \n 英文
      var item = {
        startTime: line.startTime,
        endTime: line.endTime,
        text: text
      }
      result_array.push(item)
    }

    var srt_string = object_array_to_SRT_string(result_array)
    return srt_string
  }

  // 把毫秒转成 srt 时间
  // 代码来源网络
  function ms_to_srt($milliseconds) {
    var $seconds = Math.floor($milliseconds / 1000);
    var $minutes = Math.floor($seconds / 60);
    var $hours = Math.floor($minutes / 60);
    var $milliseconds = $milliseconds % 1000;
    var $seconds = $seconds % 60;
    var $minutes = $minutes % 60;
    return ($hours < 10 ? '0' : '') + $hours + ':' +
      ($minutes < 10 ? '0' : '') + $minutes + ':' +
      ($seconds < 10 ? '0' : '') + $seconds + ',' +
      ($milliseconds < 100 ? '0' : '') + ($milliseconds < 10 ? '0' : '') + $milliseconds;
  }

  // Trigger when user select <option>
  async function download_subtitle(selector) {
    // if user select first <option>
    // we just return, do nothing.
    if (selector.selectedIndex == 0) {
      return;
    }

    // 核心概念
    // 对于完整字幕而言，英文和中文的时间轴是一致的，只需要一行行的 match 即可

    // 但是对于自动字幕就不是这样了，"自动字幕的英文"只能拿到一个个单词的开始时间和结束时间
    // "自动字幕的中文"只能拿到一个个句子
    // 现在的做法是，先拿到中文，处理成 SRT 格式，
    // 然后去拿英文，然后把英文的每个词，拿去和中文的每个句子的开始时间和结束时间进行对比
    // 如果"英文单词的开始时间"在"中文句子的开始-结束时间"区间内，那么认为这个英文单词属于这一句中文

    var caption = caption_array[selector.selectedIndex - 1]; // because first <option> is for display, so index-1 
    var lang_code = caption.lang_code;
    var lang_name = caption.lang_name;

    // if user choose auto subtitle // 如果用户选的是自动字幕
    if (caption.lang_code == 'AUTO') {
      var file_name = get_file_name(lang_name);
      download_auto_subtitle(file_name);
      selector.options[0].selected = true; // after download, select first <option>
      return
    }

    // 如果用户选的是完整字幕
    // 原文
    // sub mean "subtitle"
    var sub_original_url = await get_closed_subtitle_url(lang_code)
    var sub_original_xml = await get(sub_original_url);

    // 中文
    var sub_translated_url = sub_original_url + "&tlang=" + "zh-Hans"
    var sub_translated_xml = await get(sub_translated_url);

    // 根据时间轴融合这俩
    var sub_original_srt = parse_youtube_XML_to_object_list(sub_original_xml)
    var sub_translated_srt = parse_youtube_XML_to_object_list(sub_translated_xml)
    // 'sub_original_srt' and 'sub_translated_srt' have the same length

    var dual_language_srt = []
    for (let index = 0; index < sub_original_srt.length; index++) {
      const original = sub_original_srt[index];
      const translated = sub_translated_srt[index];
      var text = translated.text + NEW_LINE + original.text; // 中文 \n 英文
      var item = {
        startTime: original.startTime,
        endTime: original.endTime,
        text: text
      }
      dual_language_srt.push(item)
    }

    var srt_string = object_array_to_SRT_string(dual_language_srt)
    var title = get_file_name(lang_name);
    downloadString(srt_string, "text/plain", title);

    // after download, select first <option>
    selector.options[0].selected = true;
  }


  // Return something like: "(English)How Did Python Become A Data Science Powerhouse?.srt"
  function get_file_name(x) {
    return `(${x})${get_title()}.srt`;
  }

  // Detect if "auto subtitle" and "closed subtitle" exist
  // And add <option> into <select>
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
    var list_url = 'https://video.google.com/timedtext?v=' + get_video_id() + '&type=list&hl=zh-CN';
    // https://video.google.com/timedtext?v=if36bqHypqk&type=list&hl=en // 英文
    // https://video.google.com/timedtext?v=n1zpnN-6pZQ&type=list&hl=zh-CN // 中文

    GM_xmlhttpRequest({
      method: 'GET',
      url: list_url,
      onload: function (xhr) {
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
        var option = null; // for <option>
        var caption_info = null; // for our custom object

        // 自动字幕
        if (auto_subtitle_exist) {
          var auto_sub_name = get_auto_subtitle_name()
          var lang_name = `中文 + ${auto_sub_name}`
          caption_info = {
            lang_code: 'AUTO', // later we use this to know if it's auto subtitle
            lang_name: lang_name // for display only
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
            // console.log(caption); // <track id="0" name="" lang_code="en" lang_original="English" lang_translated="English" lang_default="true"/>
            var lang_code = caption.getAttribute('lang_code')
            var lang_translated = caption.getAttribute('lang_translated')
            var lang_name = `中文 + ${lang_code_to_local_name(lang_code, lang_translated)}`
            caption_info = {
              lang_code: lang_code, // for AJAX request
              lang_name: lang_name, // display to user
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

  function disable_download_button() {
    $(HASH_BUTTON_ID)
      .css('border', '#95a5a6')
      .css('cursor', 'not-allowed')
      .css('background-color', '#95a5a6');
    $('#captions_selector')
      .css('border', '#95a5a6')
      .css('cursor', 'not-allowed')
      .css('background-color', '#95a5a6');

    if (new_material_design_version()) {
      $(HASH_BUTTON_ID).css('padding', '6px');
    } else {
      $(HASH_BUTTON_ID).css('padding', '5px');
    }
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

  // Copy from: https://gist.github.com/danallison/3ec9d5314788b337b682
  // Thanks! https://github.com/danallison
  // Work in Chrome 66
  // Test passed: 2018-5-19
  function downloadString(text, fileType, fileName) {
    var blob = new Blob([text], {
      type: fileType
    });
    var a = document.createElement('a');
    a.download = fileName;
    a.href = URL.createObjectURL(blob);
    a.dataset.downloadurl = [fileType, a.download, a.href].join(':');
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 1500);
  }

  // https://css-tricks.com/snippets/javascript/unescape-html-in-js/
  // turn HTML entity back to text, example: &quot; should be "
  function htmlDecode(input) {
    var e = document.createElement('div');
    e.class = 'dummy-element-for-tampermonkey-Youtube-Subtitle-Downloader-script-to-decode-html-entity';
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
  }

  // return URL or null;
  // later we can send a AJAX and get XML subtitle
  function get_auto_subtitle_xml_url() {
    try {
      var json = get_json();
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

  // Input: lang_code like 'en'
  // Output: URL (String)
  async function get_closed_subtitle_url(lang_code) {
    try {
      var json = get_json();
      var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
      for (var index in captionTracks) {
        var caption = captionTracks[index];
        if (caption.languageCode === lang_code && caption.kind != 'asr') {
          var url = captionTracks[index].baseUrl;
          return url
        }
      }
    } catch (error) {
      console.log(error);
      return false;
    }
  }

  // Usage: var result = await get(url)
  function get(url) {
    return $.ajax({
      url: url,
      type: 'get',
      success: function (r) {
        return r
      },
      fail: function (error) {
        return error
      }
    });
  }

  // Input: XML (provide by Youtube)
  // Output: Array of object
  // each object look like: 
  /*
    {
      startTime: "",
      endTime: "",
      text: ""
    }
  */
  // it's intermediate representation for SRT
  function parse_youtube_XML_to_object_list(youtube_xml_string) {
    if (youtube_xml_string === '' || youtube_xml_string === undefined || youtube_xml_string === null) {
      return false;
    }
    var result_array = []
    var text_nodes = youtube_xml_string.getElementsByTagName('text');
    var len = text_nodes.length;
    for (var i = 0; i < len; i++) {
      var text = text_nodes[i].textContent.toString();
      text = text.replace(/(<([^>]+)>)/ig, ""); // remove all html tag.
      text = htmlDecode(text);

      var start = text_nodes[i].getAttribute('start');
      var end = parseFloat(text_nodes[i].getAttribute('start')) + parseFloat(text_nodes[i].getAttribute('dur'));

      // if (i + 1 >= len) {
      //   end = parseFloat(text_nodes[i].getAttribute('start')) + parseFloat(text_nodes[i].getAttribute('dur'));
      // } else {
      //   end = text_nodes[i + 1].getAttribute('start');
      // }

      var start_time = process_time(parseFloat(start));
      var end_time = process_time(parseFloat(end));

      var item = {
        startTime: start_time,
        endTime: end_time,
        text: text
      }
      result_array.push(item)
    }

    return result_array
  }


  /*
    Input: [ {startTime: "", endTime: "", text: ""}, {...}, {...} ]
    Output: SRT
  */
  function object_array_to_SRT_string(object_array) {
    var result = '';
    var BOM = '\uFEFF';
    result = BOM + result; // store final SRT result

    for (var i = 0; i < object_array.length; i++) {
      var item = object_array[i]
      var index = i + 1;
      var start_time = item.startTime
      var end_time = item.endTime
      var text = item.text

      var new_line = NEW_LINE;
      result = result + index + new_line;

      result = result + start_time;
      result = result + ' --> ';
      result = result + end_time + new_line;

      result = result + text + new_line + new_line;
    }

    return result;
  }

  // return "English (auto-generated)" or a default name;
  function get_auto_subtitle_name() {
    try {
      var json = get_json();
      if (typeof json.captions !== "undefined") {
        var captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
        for (var index in captionTracks) {
          var caption = captionTracks[index];
          if (typeof caption.kind === 'string' && caption.kind == 'asr') {
            return captionTracks[index].name.simpleText;
          }
        }
      }
      return 'Auto Subtitle';
    } catch (error) {
      return 'Auto Subtitle';
    }
  }

  // return player_response
  // or return null
  function get_json() {
    try {
      var json = null
      if (typeof youtube_playerResponse_1c7 !== "undefined" && youtube_playerResponse_1c7 !== null && youtube_playerResponse_1c7 !== '') {
        json = youtube_playerResponse_1c7;
      }
      if (ytplayer.config.args.player_response) {
        var raw_string = ytplayer.config.args.player_response;
        json = JSON.parse(raw_string);
      }
      if (ytplayer.config.args.raw_player_response) {
        json = ytplayer.config.args.raw_player_response;
      }
      return json
    } catch (error) {
      return null
    }
  }

  // Input a language code, output that language name in current locale
  // 如果当前语言是中文简体, Input: "de" Output: 德语
  // if current locale is English(US), Input: "de" Output: "Germany"
  function lang_code_to_local_name(languageCode, fallback_name) {
    try {
      var captionTracks = get_captionTracks()
      for (var i in captionTracks) {
        var caption = captionTracks[i];
        if (caption.languageCode === languageCode) {
          let simpleText = captionTracks[i].name.simpleText;
          if (simpleText) {
            return simpleText
          } else {
            return fallback_name
          }
        }
      }
    } catch (error) {
      return fallback_name
    }
  }

  function get_title() {
    return ytplayer.config.args.title;
  }

  function get_captionTracks() {
    let json = get_json();
    let captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
    return captionTracks
  }

})();