// ==UserScript==
// @name           Youtube 翻译中文字幕下载 v14
// @description Youtube 播放器右下角有个 Auto-tranlsate，可以把视频字幕翻成中文。这个脚本是下载这个中文字幕
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @license        MIT
// @require        https://code.jquery.com/jquery-1.12.4.min.js
// @version        14
// @grant          GM_xmlhttpRequest
// @grant          unsafeWindow
// @namespace      https://greasyfork.org/users/5711
// ==/UserScript==

/*
作者: 郑诚
邮箱:  guokrfans@gmail.com
Github: https://github.com/1c7/Youtube-Auto-Subtitle-Download

测试视频: 
https://www.youtube.com/watch?v=nGlQkaoIfBI   1门语言
https://www.youtube.com/watch?v=O5nskjZ_GoI   13门语言
https://www.youtube.com/watch?v=VfEz3DIbkvo   测试自动字幕（西班牙语）
https://www.youtube.com/watch?v=WSnKbcfsT1E

更新日志：
  2022-12-23 v13 -> v14
  修复按钮不出现的问题。
*/

;
(function () {

  // 配置项
  const NO_SUBTITLE = '无字幕';
  const HAVE_SUBTITLE = '下载翻译的中文字幕';
  const TEXT_LOADING = '载入中...';
  const BUTTON_ID = 'youtube-translate-to-chinese-subtitle-downloader-by-1c7'
  const anchor_element = "#above-the-fold #title";
  // 配置项

  var HASH_BUTTON_ID = `#${BUTTON_ID}`
  var first_load = true;

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
      init();
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
    $(HASH_BUTTON_ID).remove();
  }



  function inject_our_script() {
    var div = document.createElement('div'),
      select = document.createElement('select'),
      option = document.createElement('option');

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

    div.id = BUTTON_ID;

    select.id = 'captions_selector';
    select.disabled = true;
    select.setAttribute('style', 'display:block; border: 1px solid rgb(0, 183, 90); cursor: pointer; color: rgb(255, 255, 255); background-color: #00B75A;');

    option.textContent = TEXT_LOADING;
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

    // 把按钮加到页面上。
    document.querySelector(anchor_element).appendChild(div)

    load_language_list(select);

    // <a> element is for download
    var a = document.createElement('a');
    a.style.cssText = 'display:none;';
    a.setAttribute("id", "ForSubtitleDownload");
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(a);
  }

  // Trigger when user select <option>
  async function download_subtitle(selector) {
    // if user select first <option>, we just return, do nothing.
    if (selector.selectedIndex == 0) {
      return;
    }

    var caption = caption_array[selector.selectedIndex - 1]; // because first <option> is for display, so index-1 
    if (!caption) return;

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

    // 中文
    var sub_translated_url = sub_original_url + "&tlang=" + "zh-Hans"
    var sub_translated_xml = await get(sub_translated_url);

    var sub_translated_srt = parse_youtube_XML_to_object_list(sub_translated_xml)

    var srt_string = object_array_to_SRT_string(sub_translated_srt)
    var title = get_file_name(lang_name);
    downloadString(srt_string, "text/plain", title);

    // after download, select first <option>
    selector.options[0].selected = true;
  }

  // Return something like: "(English)How Did Python Become A Data Science Powerhouse?.srt"
  function get_file_name(x) {
    return `(${x})${get_title()}.srt`;
  }

  // 载入有多少种语言, 然后加到 <select> 里
  function load_language_list(select) {
    // auto
    var auto_subtitle_exist = false;

    // closed
    var closed_subtitle_exist = false;

    // get auto subtitle
    var auto_subtitle_url = get_auto_subtitle_xml_url();
    if (auto_subtitle_url != false) {
      auto_subtitle_exist = true;
    }

    var captionTracks = get_captionTracks()
    if (captionTracks != undefined && typeof captionTracks === 'object' && captionTracks.length > 0) {
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

    // if at least one type of subtitle exist
    select.options[0].textContent = HAVE_SUBTITLE;
    select.disabled = false;

    var caption = null; // for inside loop
    var option = null; // for <option>
    var caption_info = null; // for our custom object

    // 自动字幕
    if (auto_subtitle_exist) {
      var auto_sub_name = get_auto_subtitle_name()
      var lang_name = `${auto_sub_name} 翻译成 中文`
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
      for (var i = 0, il = captionTracks.length; i < il; i++) {
        var caption = captionTracks[i];
        if (caption.kind == 'asr') {
          continue
        }
        let lang_code = caption.languageCode
        let lang_translated = caption.name.simpleText
        var lang_name = `${lang_code_to_local_name(lang_code, lang_translated)} 翻译成 中文`
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
      var captionTracks = get_captionTracks()
      for (var index in captionTracks) {
        var caption = captionTracks[index];
        if (typeof caption.kind === 'string' && caption.kind == 'asr') {
          return captionTracks[index].baseUrl;
        }
        // ASR – A caption track generated using automatic speech recognition.
        // https://developers.google.com/youtube/v3/docs/captions
      }
      return false;
    } catch (error) {
      return false;
    }
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

  // 下载自动字幕的中英双语
  // 输入: file_name: 保存的文件名
  // 输出: 无 (会触发浏览器下载一个文件)
  async function download_auto_subtitle(file_name) {
    var auto_sub_url = get_auto_subtitle_xml_url();
    var format_json3_url = auto_sub_url + '&fmt=json3'
    var cn_url = format_json3_url + '&tlang=zh-Hans'

    var cn_srt = await auto_sub_in_chinese_fmt_json3_to_srt(cn_url)
    var srt_string = to_srt(cn_srt)

    downloadString(srt_string, "text/plain", file_name);
  }

  function to_srt(srt_array) {
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
      var text = line.text; // 中文
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

  // return "English (auto-generated)" or a default name;
  function get_auto_subtitle_name() {
    const name = "自动字幕"
    try {
      var captionTracks = get_captionTracks()
      for (var index in captionTracks) {
        var caption = captionTracks[index];
        if (typeof caption.kind === 'string' && caption.kind == 'asr') {
          return captionTracks[index].name.simpleText;
        }
      }
      return name;
    } catch (error) {
      console.log(error);
      return name;
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


  // 输入: url (String)
  // 输出: SRT (Array)
  async function auto_sub_in_chinese_fmt_json3_to_srt(url) {
    var srt_array = []

    var json = await get(url);
    var events = json.events;
    for (let index = 0; index < events.length; index++) {
      const event = events[index];

      if (event.segs === undefined) {
        continue
      }
      if (event.segs.length === 1 && event.segs[0].utf8 === '\n') {
        continue
      }

      var tStartMs = event.tStartMs
      var dDurationMs = event.dDurationMs
      var segs = event.segs
      var text = segs.map(seg => seg.utf8).join("")

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

  // 毫秒转成 srt 时间
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

      var new_line = "\n";
      result = result + index + new_line;

      result = result + start_time;
      result = result + ' --> ';
      result = result + end_time + new_line;

      result = result + text + new_line + new_line;
    }

    return result;
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

  // Input: lang_code like 'en'
  // Output: URL (String)
  async function get_closed_subtitle_url(lang_code) {
    try {
      var captionTracks = get_captionTracks()
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

  function get_youtube_data() {
    return document.getElementsByTagName("ytd-app")[0].data.playerResponse
  }

  function get_captionTracks() {
    let data = get_youtube_data();
    var captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    return captionTracks
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

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

  // 等待一个元素存在
  // https://stackoverflow.com/questions/5525071/how-to-wait-until-an-element-exists
  function waitForElm(selector) {
    return new Promise((resolve) => {
      if (document.querySelector(selector)) {
        return resolve(document.querySelector(selector))
      }

      const observer = new MutationObserver((mutations) => {
        if (document.querySelector(selector)) {
          resolve(document.querySelector(selector))
          observer.disconnect()
        }
      })

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      })
    })
  }

  function init() {
    console.log('进入 init');
    unsafeWindow.caption_array = [];
    inject_our_script();
    first_load = false;
  }

  async function main() {
    console.log('进入 main');
    await waitForElm(anchor_element)
    init()
  }

  setTimeout(main, 2000);
})();