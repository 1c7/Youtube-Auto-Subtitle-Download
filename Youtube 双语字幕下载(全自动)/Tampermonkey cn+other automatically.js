// ==UserScript==
// @name           Youtube 双语字幕下载 v8 (全自动下载，页面打开就下载）
// @include        https://*youtube.com/*
// @author         Cheng Zheng
// @require        https://code.jquery.com/jquery-1.12.4.min.js
// @require        https://cdn.bootcdn.net/ajax/libs/jquery/1.12.4/jquery.min.js
// @version        8
// @copyright      2020-2021 Cheng Zheng
// @grant GM_xmlhttpRequest
// @description   全自动下载，字幕格式是 "中文 \n 英语"（\n 是换行符的意思) 下载以英文优先，如果找不到"英文"就找"英文(自动识别)", 如果也找不到，就选第一门语言（比如德语法语等），此脚本**仅适合**下载字幕超级频繁的用户
// @license       MIT
// @namespace  https://greasyfork.org/users/5711
// ==/UserScript==

/*
  这个脚本只是在 "Youtube 双语字幕下载" 的基础上加了个打开页面就马上下载的功能。没有别的。

  2021-11-14 说明
  更新到了 v7，把 get_json() 去掉了，加了 get_youtube_data()

  写于2021-1-16
  测试视频
    https://www.youtube.com/watch?v=DEgzuMmJtu8 只有一个自动字幕
    https://www.youtube.com/watch?v=pwZpJzpE2lQ 只有一个自动字幕
    https://www.youtube.com/watch?v=F0QwAhUnpr4 只有一个英语字幕（非自动）
    https://www.youtube.com/watch?v=3npuPXvA_g8 只有一个英语字幕（非自动）

  作者联系方式:
    QQ 1003211008
    邮件 guokrfans@gmail.com
    Github@1c7
    微信 agoodob

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
  
  说明:
    对于有些视频，比如 https://www.youtube.com/watch?v=ndEH1yHs3do （只有一个英语(自动生成)的字幕)
    如果在 Youtube 上手动用"自动翻译"功能，翻译成中文会失败 (Console 里可以看到 404 报错)
    但是某一次尝试又可以显示翻译后的中文，
    总而言之，如果获取中文(翻译而成的)字幕失败了
    就退化成下载单语字幕
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

  async function inject_our_script() {
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

    await load_language_list(select);
    // 载入语言列表完成后，就应该马上下载了

    // <a> element is for download
    var a = document.createElement('a');
    a.style.cssText = 'display:none;';
    a.setAttribute("id", "ForSubtitleDownload");
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(a);

    // 自动下载字幕
    download_subtitle_automatically()
  }

  // 页面打开就马上自动下载字幕（如果有字幕的话）
  // 下载的优先级(从高到低）：英文的 closed, 英文的 auto，如果没有英文就选第一个语言（不管是什么语言）
  function download_subtitle_automatically() {
    const EnglishLanguageCode = 'en'
    var captionTracks = get_captionTracks()

    // 如果没有任何字幕（也没有自动字幕）
    if (captionTracks == undefined || typeof captionTracks != 'object' || captionTracks.length == 0) {
      return; // 直接退出
    }

    // 只有1个字幕，那也没什么可选的，直接下载就是了
    if (captionTracks.length == 1) {
      var only_caption = captionTracks[0];
      download_track(only_caption);
      return;
    }

    // 有多个字幕(至少2个)

    // 如果找得到 en 的 closed 字幕就直接下载
    for (var i in captionTracks) {
      var caption = captionTracks[i];
      if (caption.languageCode === EnglishLanguageCode && caption.kind != 'asr') {
        download_closed_subtitle(caption.languageCode)
        return;
      }
    }

    // 如果找得到 en 的 auto 字幕就直接下载
    for (var i in captionTracks) {
      var caption = captionTracks[i];
      console.log(caption);
      if (caption.languageCode === EnglishLanguageCode && caption.kind == 'asr') {
        download_closed_subtitle(caption.languageCode)
        return;
      }
    }

    // 到这里了，说明完全没有 en 的字幕
    for (var i in captionTracks) {
      var caption = captionTracks[i];
      download_closed_subtitle(caption.languageCode) // 那就不管了，直接下载第一个，收工
      return;
    }
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

  // 下载自动字幕的中英双语
  // 输入: file_name: 保存的文件名
  // 输出: 无 (会触发浏览器下载一个文件)
  // 这个自动字幕支持英语和其他语言
  async function download_auto_subtitle(file_name) {

    // 如果没传入文件名参数，自己构建一个
    var save_file_name = file_name
    if (save_file_name == undefined || save_file_name == null) {
      var auto_sub_name = get_auto_subtitle_name()
      var lang_name = `中文 + ${auto_sub_name}`
      save_file_name = get_file_name(lang_name);
    }

    // 1. English Auto Sub in json3 format
    var auto_sub_url = get_auto_subtitle_xml_url();
    var format_json3_url = auto_sub_url + '&fmt=json3'
    var en_auto_sub = await get(format_json3_url); // 格式参考 Youtube-Subtitle-Downloader/fmt=json3/en.json

    // 2. 自动字幕的翻译中文
    var cn_url = format_json3_url + '&tlang=zh-Hans'
    var cn_srt = await auto_sub_in_chinese_fmt_json3_to_srt(cn_url) // 格式参考 Youtube-Subtitle-Downloader/fmt=json3/zh-Hans.json

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
    var srt_string = auto_sub_dual_language_to_srt(cn_srt) // 结合中文和英文
    downloadString(srt_string, "text/plain", save_file_name);
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
    // if (caption.lang_code == 'AUTO') {
    //   var file_name = get_file_name(lang_name);
    //   download_auto_subtitle(file_name);
    //   selector.options[0].selected = true; // after download, select first <option>
    //   return
    // }

    // 如果用户选的是完整字幕
    // download_closed_subtitle(lang_code)
    download_subtitle_auto_or_closed(lang_code)

    // after download, select first <option>
    selector.options[0].selected = true;
  }

  async function download_subtitle_auto_or_closed(lang_code) {
    console.log('进入了 download_subtitle_auto_or_closed')
    var tracks = get_subtitle_tracks(lang_code)
    for (var i = 0; i < tracks.length; i++) {
      download_track(tracks[i]);
    }
  }

  async function download_track(track) {
    // var track_example = {
    //   "baseUrl": "https://www.youtube.com/api/timedtext?v=ndEH1yHs3do&asr_langs=de,en,es,fr,it,ja,ko,nl,pt,ru&caps=asr&exp=xftt&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1611013233&sparams=ip,ipbits,expire,v,asr_langs,caps,exp,xorp,xoaf&signature=BE20789C5F677B5BD1125F72C0705ED7FE5279D5.88DA199671617E6D814E3F3A6A037AC1DD49E999&key=yt8&kind=asr&lang=en",
    //   "name": {
    //     "simpleText": "英语 (自动生成)"
    //   },
    //   "vssId": "a.en",
    //   "languageCode": "en",
    //   "kind": "asr",
    //   "isTranslatable": true
    // }
    var boolean_original = false; // 获取"原语言"字幕成功或失败
    var boolean_translated = false; // 获取"翻译"字幕成功或失败

    // 尝试获取原语言字幕
    var baseUrl = track.baseUrl
    try {
      var baseUrl_xml = await get(baseUrl);
      boolean_original = true;
    } catch (error) {
      console.log('尝试下载原语言字幕失败');
      console.log(error);
    }
    var baseUrl_object = parse_youtube_XML_to_object_list(baseUrl_xml)

    console.log(baseUrl)
    console.log(baseUrl_xml)
    console.log(baseUrl_object)

    // 尝试获取中文(翻译而来)字幕
    var cnUrl = baseUrl + "&tlang=" + "zh-Hans"
    try {
      var cnUrl_xml = await get(cnUrl);
      boolean_translated = true;
    } catch (error) {
      console.log('尝试下载中文字幕失败');
      console.log(error);
    }

    // 双语字幕获取成功
    if (boolean_original && boolean_translated) {
      console.log('双语字幕获取成功');
      // TODO: 因为找不到例子视频，这部分暂时没法写
    }

    // 单语字幕获取成功
    if (boolean_original) {
      console.log('单语字幕获取成功');
      var base_SRT_String = object_array_to_SRT_string(baseUrl_object)
      var lang_name = lang_code_to_local_name(track.languageCode)
      var title = get_file_name(lang_name);
      downloadString(base_SRT_String, "text/plain", title);
    }

  }

  async function download_closed_subtitle(lang_code) {
    console.log('进入了 download_closed_subtitle')
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
    var lang_name = lang_code_to_local_name(lang_code)
    var file_name_prefix = `中文+${lang_name}`
    var title = get_file_name(file_name_prefix);
    downloadString(srt_string, "text/plain", title);
  }


  // Return something like: "(English)How Did Python Become A Data Science Powerhouse?.srt"
  function get_file_name(x) {
    return `(${x})${get_title()}.srt`;
  }

  // Detect if "auto subtitle" and "closed subtitle" exist
  // And add <option> into <select>
  function load_language_list(select) {
    return new Promise(async function (resolve, reject) {
      console.log('进入了读取语言列表')
      // auto
      var auto_subtitle_exist = false;

      // closed
      var closed_subtitle_exist = false;
      var captions = null;

      // get auto subtitle
      // var auto_subtitle_url = get_auto_subtitle_xml_url();
      // if (auto_subtitle_url != false) {
      //   auto_subtitle_exist = true;
      //   // console.log('自动字幕存在鸭');
      //   // console.log(auto_subtitle_url);
      // }
      // return;

      // get closed subtitle
      // var list_url = 'https://video.google.com/timedtext?v=' + get_video_id() + '&type=list&hl=zh-CN';
      // https://video.google.com/timedtext?v=if36bqHypqk&type=list&hl=en // 英文
      // https://video.google.com/timedtext?v=n1zpnN-6pZQ&type=list&hl=zh-CN // 中文
      // var result = await get(list_url)
      // console.log(result);


      var captionTracks = get_captionTracks()
      /*
      var captionTracks_example = [{
        "baseUrl": "https://www.youtube.com/api/timedtext?v=ndEH1yHs3do&asr_langs=de,en,es,fr,it,ja,ko,nl,pt,ru&caps=asr&exp=xftt&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1611013233&sparams=ip,ipbits,expire,v,asr_langs,caps,exp,xorp,xoaf&signature=BE20789C5F677B5BD1125F72C0705ED7FE5279D5.88DA199671617E6D814E3F3A6A037AC1DD49E999&key=yt8&kind=asr&lang=en",
        "name": {
          "simpleText": "英语 (自动生成)"
        },
        "vssId": "a.en",
        "languageCode": "en",
        "kind": "asr",
        "isTranslatable": true
      }]
      */
      // 如果什么字幕都没有
      if (captionTracks == undefined || captionTracks.length == 0) {
        select.options[0].textContent = NO_SUBTITLE;
        disable_download_button();
        return false;
      }
      // if at least one type of subtitle exist
      select.options[0].textContent = HAVE_SUBTITLE;
      select.disabled = false;

      // if (auto_subtitle_exist) {
      //   var auto_sub_name = get_auto_subtitle_name()
      //   var lang_name = `中文 + ${auto_sub_name}`
      //   caption_info = {
      //     lang_code: 'AUTO', // later we use this to know if it's auto subtitle
      //     lang_name: lang_name // for display only
      //   };
      //   caption_array.push(caption_info);

      //   option = document.createElement('option');
      //   option.textContent = caption_info.lang_name;
      //   select.appendChild(option);
      // }

      // console.log('开始循环');
      for (let i = 0; i < captionTracks.length; i++) {
        const caption = captionTracks[i];
        var baseUrl = caption.baseUrl // example: https://www.youtube.com/api/timedtext?v=ndEH1yHs3do&asr_langs=de,en,es,fr,it,ja,ko,nl,pt,ru&caps=asr&exp=xftt&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1611014244&sparams=ip,ipbits,expire,v,asr_langs,caps,exp,xorp,xoaf&signature=7598A4500FEBED9F45DAD16B22B4E6198252ED18.51CC425B41177775A71F492BE8507140731B7AAB&key=yt8&kind=asr&lang=en
        // <transcript>
        // <text start="1.12" dur="4.639">at this point in the texturing process</text>
        // <text start="3.12" dur="5.6">we have some important decisions to make</text>
        // <text start="5.759" dur="3.76">is this skull going to be really old is</text>
        // <text start="8.72" dur="3.12">it going to be</text>
        // <text start="9.519" dur="4.24">a brand new skull is this skull</text>
        // </transcript>
        // console.log(baseUrl)
        var languageCode = caption.languageCode
        var name = caption.name.simpleText
        var lang_name = `中文 + ${name}`
        caption_info = {
          lang_code: languageCode, // for AJAX request
          lang_name: lang_name, // display to user
        };
        caption_array.push(caption_info);
        // 注意这里是加到 caption_array, 一个全局变量, 待会要靠它来下载
        option = document.createElement('option');
        option.textContent = caption_info.lang_name;
        select.appendChild(option);
      }
      resolve();

      return;

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

          resolve();
        }
      });
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
      var captionTracks = get_captionTracks()
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

  // input: lang_code like 'en'
  // output: array
  function get_subtitle_tracks(lang_code) {
    var array = []
    try {
      var captionTracks = get_captionTracks()
      for (var index in captionTracks) {
        var caption = captionTracks[index];
        if (caption.languageCode === lang_code) {
          array.push(captionTracks[index]) // for language like 'en' 可能有2条纪录，一条 kind==asr 是自动识别的，另一条没有  kind 属性代表是  closed 字幕
        }
      }
      return array
    } catch (error) {
      console.log(error);
      return false;
    }
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
      // var end = parseFloat(text_nodes[i].getAttribute('start')) + parseFloat(text_nodes[i].getAttribute('dur'));

      if (i + 1 >= len) {
        end = parseFloat(text_nodes[i].getAttribute('start')) + parseFloat(text_nodes[i].getAttribute('dur'));
      } else {
        end = text_nodes[i + 1].getAttribute('start');
      }

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
  function object_array_to_SRT_string(object_array, file_encoding_with_BOM = true) {
    var result = ''; // store final SRT result

    if (file_encoding_with_BOM) {
      var BOM = '\uFEFF';
      result = BOM + result;
    }

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

  // return "English (auto-generated)" or a default name;
  function get_auto_subtitle_name() {
    try {
      var captionTracks = get_captionTracks()
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

  // Input a language code, output that language name in current locale
  // 如果当前语言是中文简体, Input: "de" Output: 德语
  // if current locale is English(US), Input: "de" Output: "Germany"
  function lang_code_to_local_name(languageCode, fallback_name = null) {
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

  function get_youtube_data(){
    return document.getElementsByTagName("ytd-app")[0].data.playerResponse
  }

  function get_captionTracks() {
    let data = get_youtube_data();
    var captionTracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks
    return captionTracks
  }

})();