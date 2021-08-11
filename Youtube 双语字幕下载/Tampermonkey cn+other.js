// ==UserScript==
// @name           Youtube 双语字幕下载 v9 (中文+任选的一门双语,比如英语) 
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @require        https://code.jquery.com/jquery-1.12.4.min.js
// @version        9
// @copyright      Zheng Cheng
// @grant GM_xmlhttpRequest
// @description   字幕格式是 "中文 \n 英语"（\n 是换行符的意思）
// @namespace  https://greasyfork.org/users/5711
// ==/UserScript==

/*
  友情提示:
    如果本脚本不能使用，有一定概率是因为 jQuery 的 CDN 在你的网络环境下无法载入，
    也就是以下这一句的问题：
    @require        https://code.jquery.com/jquery-1.12.4.min.js

    解决办法：去网上随便找一个 jQuery 的 CDN 地址，替换掉这个，比如
    https://cdn.bootcdn.net/ajax/libs/jquery/1.12.4/jquery.js
    https://cdn.staticfile.org/jquery/1.12.4/jquery.min.js

  作者联系方式:
    QQ 1003211008
    邮件 guokrfans@gmail.com
    Github@1c7

  使用场景:
    此文件仅针对于 Tampermonkey (Chrome 上的一款插件)
    (意思是需要安装在 Tampermonkey 里来运行)

  解决什么问题：
    下载中外双语的字幕，格式是 中文 \n 外语, \n 是换行符的意思
  
  术语说明：
    auto 自动字幕
    closed 完整字幕 (或者叫人工字幕也可以)

  原理说明: 
    对于"完整字幕", Youtube 返回的时间轴完全一致，因此只需要结合在一起即可，相对比较简单。
    对于"自动字幕"，中文是一个个句子，英文是一个个单词，格式不同，时间轴也不同
    因此，会基于中文的句子时间（时间轴），把英文放进去
  
  特别感谢:
    ytian(tianyebj)：解决英文字幕匹配错误的问题 (https://github.com/1c7/Youtube-Auto-Subtitle-Download/pull/11)

  备忘:
    如果要把字符串保存下来, 使用: 
    downloadString(srt_string, "text/plain", file_name);

  用于测试的视频: 
    https://www.youtube.com/watch?v=JfBZfnkg1uM
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

  // 把 console.log 包装一层, 方便"开启"/"关闭"
  // 这样可以在代码里遗留很多 console.log，实际运行时"关闭"掉不输出, 调试时"开启"
  // function logging(...args) {
  //   if(typeof(console) !== 'undefined') {
  //     console.log(...args);
  //   }
  // }

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

    // 2021-8-11 更新
    // 自动字幕的改了，和完整字幕一样了。

    var caption = caption_array[selector.selectedIndex - 1]; // because first <option> is for display, so index-1 
    var lang_code = caption.lang_code;
    var lang_name = caption.lang_name;

    // 初始化2个变量
    var origin_url = null;
    var translated_url = null;

    // if user choose auto subtitle 
    // 如果用户选的是自动字幕
    if (caption.lang_code == 'AUTO') {
      origin_url = get_auto_subtitle_xml_url();
    } else {
      // 如果用户选的是完整字幕
      origin_url = await get_closed_subtitle_url(lang_code)
    }

    translated_url = origin_url + '&tlang=zh-Hans'

    var original_xml = await get(origin_url);
    var translated_xml = await get(translated_url);

    // 根据时间轴融合这俩

    var original_srt = parse_youtube_XML_to_object_list(original_xml)
    var translated_srt = parse_youtube_XML_to_object_list(translated_xml)
    var dual_language_srt = merge_srt(original_srt, translated_srt);

    var srt_string = object_array_to_SRT_string(dual_language_srt)
    var title = get_file_name(lang_name);
    downloadString(srt_string, "text/plain", title);

    // after download, select first <option>
    selector.options[0].selected = true;
  }

  // 把两个语言的 srt 数组组合起来，
  // 比如把英文和中文的组合起来。
  function merge_srt(srt_A, srt_B) {
    var dual_language_srt = [];

    for (let index = 0; index < srt_A.length; index++) {
      const element_A = srt_A[index];
      const element_B = srt_B[index];

      var text = element_B.text + NEW_LINE + element_A.text; // 中文 \n 英文
      var item = {
        startTime: element_A.startTime,
        endTime: element_A.endTime,
        text: text,
      };

      dual_language_srt.push(item);
    }
    return dual_language_srt;
  }


  // Return something like: "(English)How Did Python Become A Data Science Powerhouse?.srt"
  function get_file_name(x) {
    return `(${x})${get_title()}.srt`;
  }

  // Detect if "auto subtitle" and "closed subtitle" exist
  // And add <option> into <select>
  // 加载语言列表
  function load_language_list(select) {
    // auto
    var auto_subtitle_exist = false; // 自动字幕是否存在(默认 false)

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

  // 禁用下载按钮
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
    e.class = 'dummy-element-for-tampermonkey-Youtube-cn-other-subtitle-script-to-decode-html-entity-2021-8-11';
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
  }

  // 获得自动字幕的地址
  // return URL or null;
  // later we can send a AJAX and get XML subtitle
  // 例子输出: https://www.youtube.com/api/timedtext?v=JfBZfnkg1uM&asr_langs=de,en,es,fr,it,ja,ko,nl,pt,ru&caps=asr&exp=xftt,xctw&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1628691971&sparams=ip,ipbits,expire,v,asr_langs,caps,exp,xorp,xoaf&signature=55984444BD75E34DB9FE809058CCF7DE5B1AB3B5.193DC32A1E0183D8D627D229C9C111E174FF56FF&key=yt8&kind=asr&lang=en
  /*
    如果直接访问这个地址，里面的格式是 XML，比如
    <transcript>
      <text start="0.589" dur="6.121">hello in this video I would like to</text>
      <text start="3.6" dur="5.88">share what I&#39;ve learned about setting up</text>
      <text start="6.71" dur="5.08">shadows and shadow casting and shadow</text>
      <text start="9.48" dur="5.6">occlusion and stuff like that in a</text>
    </transcript>
  */
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

  // 把 ajax 请求简单 wrap 一下方便使用
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

      var start = text_nodes[i].getAttribute('start'); // 开始时间
      var end = parseFloat(text_nodes[i].getAttribute('start')) + parseFloat(text_nodes[i].getAttribute('dur')); // 结束时间

      // 如果需要"结束时间"和下一行的"开始时间"是连续的，取消下面代码的注释
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

  // 获取当前视频的标题 (String), 比如 "How Does the Earth Move? Crash Course Geography #5"
  // https://www.youtube.com/watch?v=ljjLV-5Sa98
  // 获取视频标题
  function get_title() {
    // 方法1：先尝试拿到标题
    var title_element = document.querySelector(
      "h1.title.style-scope.ytd-video-primary-info-renderer"
    );
    if (title_element != null) {
      var title = title_element.innerText;
      // 能拿到就返回
      if (title != undefined && title != null && title != "") {
        return title;
      }
    }
    // 方法2：如果方法1失效用这个
    return ytplayer.config.args.title; // 这个会 delay, 如果页面跳转了，这个获得的标题还是旧的
  }

  function get_captionTracks() {
    let json = get_json();
    let captionTracks = json.captions.playerCaptionsTracklistRenderer.captionTracks;
    return captionTracks
  }

})();