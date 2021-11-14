// ==UserScript==
// @name           Youtube 下载自动字幕 (字词级) v4
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @require        https://code.jquery.com/jquery-1.12.4.min.js
// @version        4
// @grant GM_xmlhttpRequest
// @namespace https://greasyfork.org/users/5711
// @description   （下载 .json 文件）字词级字幕仅适用于自动字幕（也就是机器用语音转文字识别出来的字幕）（完整字幕没有字词级的）下载字词级的意义是方便分句。可下载两种格式：原版 (&fmt=json3 从 Youtube 获取的原样返回) 和简化版 {startTime: "开始时间(毫秒)", endTime: "结束时间(毫秒)", text: "文字"}。 json 格式不可配合视频直接播放，需要其他软件进行进一步处理（把词拼成句子，转成 srt 格式）
// @license  MIT
// ==/UserScript==

// 初次写于2021-2-21
(function () {
  // 可配置项
  var NO_SUBTITLE = '无自动字幕';
  var HAVE_SUBTITLE = '下载自动字幕 (字词级)';
  var TEXT_LOADING = '加载中...';
  const BUTTON_ID = 'youtube-download-word-level-subtitle-last-update-2021-2-21'
  // 可配置项

  var HASH_BUTTON_ID = `#${BUTTON_ID}`

  // 初始化
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
    var RETRY_LIMIT = 30;
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
    return get_url_video_id() !== null;
  }

  // return string like "RW1ChiWyiZQ",  from "https://www.youtube.com/watch?v=RW1ChiWyiZQ"
  // or null
  function get_url_video_id() {
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

    var css_div = `display: table; 
    margin-top:4px;
    border: 1px solid rgb(0, 183, 90); 
    cursor: pointer; color: rgb(255, 255, 255); 
    border-top-left-radius: 3px; 
    border-top-right-radius: 3px; 
    border-bottom-right-radius: 3px; 
    border-bottom-left-radius: 3px; 
    background-color: #00B75A;
    `;
    div.setAttribute('style', css_div);

    div.id = BUTTON_ID;

    select.id = 'captions_selector';
    select.disabled = true;
    let css_select = `display:block; 
    border: 1px solid rgb(0, 183, 90); 
    cursor: pointer; 
    color: rgb(255, 255, 255); 
    background-color: #00B75A;
    padding: 4px;
    `;
    select.setAttribute('style', css_select);

    option.textContent = TEXT_LOADING;
    option.selected = true;
    select.appendChild(option);

    // 下拉菜单里，选择一项后触发下载
    select.addEventListener('change', function () {
      download_subtitle(this);
    }, false);

    div.appendChild(select); // put <select> into <div>

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

  // trigger when user select <option>
  async function download_subtitle(selector) {
    // if user select first <option>, we just return, do nothing.
    if (selector.selectedIndex == 0) {
      return;
    }

    var caption = caption_array[selector.selectedIndex - 1];
    // because first <option> is for display, so index - 1 

    var result = null;
    var filename = null; // 保存文件名

    // if user choose auto subtitle
    if (caption.lang_code == 'AUTO-original') {
      result = await get_auto_subtitle();
      filename = get_file_name(`原版 JSON-${get_auto_subtitle_name()}`);
      downloadString(JSON.stringify(result), "text/plain", filename);
    }

    if (caption.lang_code == 'AUTO-simplify') {
      result = await get_auto_subtitle();
      filename = get_file_name(`简化版 JSON-${get_auto_subtitle_name()}`);
      let json = parse_youtube_XML_to_JSON(result);
      downloadString(JSON.stringify(json), "text/plain", filename);
    }

    // After download, select first <option>
    selector.options[0].selected = true;
  }

  function get_file_name(x) {
    var suffix = 'json'
    var method_3 = `(${x})${get_title()}_video_id_${get_video_id()}.${suffix}`;
    return method_3
  }

  // detect if "auto subtitle" and "closed subtitle" exist
  // and add <option> into <select>
  function load_language_list(select) {
    var auto_subtitle_exist = false;

    // get auto subtitle
    var auto_subtitle_url = get_auto_subtitle_xml_url();
    if (auto_subtitle_url != false) {
      auto_subtitle_exist = true;
    }

    // if no subtitle at all, just say no and stop
    if (auto_subtitle_exist == false) {
      select.options[0].textContent = NO_SUBTITLE;
      disable_download_button();
      return false;
    }

    // if at least one type of subtitle exist
    select.options[0].textContent = HAVE_SUBTITLE;
    select.disabled = false;

    var option = null; // for <option>
    var caption_info = null; // for our custom object

    // if auto subtitle exist
    if (auto_subtitle_exist) {
      caption_info = {
        lang_code: 'AUTO-original',
        lang_name: `${get_auto_subtitle_name()} (原版)`,
      };
      caption_array.push(caption_info);
      option = document.createElement('option');
      option.textContent = caption_info.lang_name;
      select.appendChild(option);

      caption_info = {
        lang_code: 'AUTO-simplify',
        lang_name: `${get_auto_subtitle_name()} (简化版)`,
      };
      caption_array.push(caption_info);
      option = document.createElement('option');
      option.textContent = caption_info.lang_name;
      select.appendChild(option);
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

  // copy from: https://gist.github.com/danallison/3ec9d5314788b337b682
  // Thanks! https://github.com/danallison
  // work in Chrome 66
  // test passed: 2018-5-19
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
      var captionTracks = get_captionTracks()
      for (var index in captionTracks) {
        var caption = captionTracks[index];
        if (caption.kind === 'asr') {
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

  function get_auto_subtitle_json_url() {
    return `${get_auto_subtitle_xml_url()}&fmt=json3`
  }

  async function get_auto_subtitle() {
    var url = get_auto_subtitle_json_url();
    if (url == false) {
      return false;
    }
    var result = await get(url)
    return result
  }

  function parse_youtube_XML_to_JSON(json) {
    var final_result = [];

    // var template_example = {
    //   startTime: null,
    //   endTime: null,
    //   text: null
    // }

    var events = json.events

    for (var i = 0; i < events.length; i++) {
      var event = events[i];

      // 对于内容(segs)为空的，直接跳过
      if (event.segs == undefined) {
        continue
      }

      // aAppend 就是只有一个 \n
      if (event.aAppend != undefined) {
        continue
      }

      var startTime = null
      var endTime = event.tStartMs + event.dDurationMs;
      var text = null;

      var segs = event.segs
      for (var j = 0; j < segs.length; j++) {
        var seg = segs[j];
        if (seg.tOffsetMs) {
          startTime = event.tStartMs + seg.tOffsetMs
        } else {
          startTime = event.tStartMs
        }
        text = seg.utf8;
        var one = {
          startTime: startTime,
          endTime: endTime,
          text: text,
        }
        final_result.push(one);
      }
    }
    return final_result;
  }

  // return "English (auto-generated)" or a default name;
  function get_auto_subtitle_name() {
    try {
      var captionTracks = get_captionTracks();
      for (var index in captionTracks) {
        var caption = captionTracks[index];
        if (typeof caption.kind === 'string' && caption.kind == 'asr') {
          return captionTracks[index].name.simpleText;
        }
      }
      return 'Auto Subtitle';
    } catch (error) {
      return 'Auto Subtitle';
    }
  }

  function get_youtube_data(){
    return document.getElementsByTagName("ytd-app")[0].data.playerResponse
  }

  function get_captionTracks() {
    let data = get_youtube_data();
    var captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    return captionTracks
  }

  function get_title() {
    return ytplayer.config.args.title;
  }

  function get_video_id() {
    return ytplayer.config.args.video_id;
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

})();