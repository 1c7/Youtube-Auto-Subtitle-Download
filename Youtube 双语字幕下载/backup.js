// 有些代码虽然现在不需要了
// 但是以后有可能要，就存在这里。
// 我不喜欢翻 git log 找删掉的代码，这种备份代码的方式比较方便。

// 输入: url (String)
// 输出: SRT (Array)
async function url_json_srt(url) {
  var json = await get(url);
  return youtube_json_to_srt(json);
}

// 输入: Youtube 格式的 JSON
// 输出: SRT 格式
function youtube_json_to_srt(json) {
  var srt_array = [];
  var events = json.events;
  for (var i = 0; i < events.length; i++) {
    const event = events[i];

    if (event.segs === undefined) {
      continue;
    }
    if (event.segs.length === 1 && event.segs[0].utf8 === "\n") {
      continue;
    }

    // 先把数据都拿到
    var tStartMs = event.tStartMs;
    var dDurationMs = event.dDurationMs;
    var segs = event.segs;
    var text = segs.map((seg) => seg.utf8).join("");

    // 然后构造
    var item = {
      startTime: ms_to_srt(tStartMs),
      endTime: ms_to_srt(tStartMs + dDurationMs),
      text: text,

      tStartMs: tStartMs,
      dDurationMs: dDurationMs,
    };
    srt_array.push(item);
  }
  return srt_array;
}

// 这个是之前旧的拼合方法，拼合英语和中文字幕
function match_srt_old(en_auto_sub, cn_srt) {
  // 3. 处理英文，插入到句子里, 也就是插入到 cn_srt 的每个元素里（新加一个属性叫 words)
  var events = en_auto_sub.events;
  for (let i = 0; i < events.length; i++) {
    // loop events
    let event = events[i];
    if (event.aAppend == 1) {
      // 这样的元素内部只有一个换行符，对我们没有意义，跳过
      continue;
    }
    var segs = event.segs;
    if (segs == undefined) {
      // 这样的元素也没意义，跳过
      continue;
    }
    var tStartMs = event.tStartMs;
    var dDurationMs = event.dDurationMs;

    for (let j = 0; j < segs.length; j++) {
      // loop segs
      const seg = segs[j];
      var word = seg.utf8; // 词的内容

      var word_offset = seg.tOffsetMs === undefined ? 0 : seg.tOffsetMs;
      var word_start_time = tStartMs + word_offset; // 词的开始时间

      for (let z = 0; z < cn_srt.length; z++) {
        // loop each word and put into cn_srt
        const srt_line = cn_srt[z];
        var line_start_time_ms = srt_line.tStartMs;
        var line_end_time_ms = srt_line.tStartMs + dDurationMs;

        // 如果词的开始时间，刚好处于这个句子的 [开始时间, 结束时间] 区间之内
        if (
          word_start_time >= line_start_time_ms &&
          word_start_time <= line_end_time_ms
        ) {
          // push 到 words 数组里
          if (cn_srt[z].words === undefined) {
            cn_srt[z].words = [word];
          } else {
            var final_word = ` ${word.trim()}`; // 去掉单词本身的空格（不管有没有）然后给单词前面加一个空格
            cn_srt[z].words.push(final_word);
          }
        }
      }
    }
  }
}

// tianyebj 写的
function match_srt_new(en_auto_sub, cn_srt) {
  var events = en_auto_sub.events;

  // 如果中英文任意一边的内容长度为 0，没啥好处理的，直接退出
  if (cn_srt.length == 0 || events.length == 0) {
    return;
  }

  var cn_i = 0;
  var segs = [];
  var en_i = 0;

  for (; en_i < events.length; en_i++) {
    // 遍历英文的 events
    var event = events[en_i];

    // 如果内容是空，跳过
    if (event.segs === undefined) {
      continue;
    }

    // 如果内容里只有一个换行，跳过
    if (event.segs.length === 1 && event.segs[0].utf8 === "\n") {
      continue;
    }

    var tStartMs = event.tStartMs; // 开始时间
    var dDurationMs = event.dDurationMs; // 持续时间

    // 判断同 index 下开始时间和结束时间是否一直
    if (
      tStartMs == cn_srt[cn_i].tStartMs &&
      dDurationMs == cn_srt[cn_i].dDurationMs
    ) {
      if (cn_i > 0) {
        cn_srt[cn_i - 1].words = fmt_segs([...segs]);
        segs = [];
      }
      cn_i++;
      if (cn_i == cn_srt.length) {
        //到达最后一个元素
        break;
      }
    }
    process_segs(segs, event);
  }
  //process last sentence
  segs = [];
  for (; en_i < events.length; en_i++) {
    var event = events[en_i];
    process_segs(segs, event);
  }
  cn_srt[cn_i - 1].words = fmt_segs(segs);
}

function process_segs(array, event) {
  // 如果没有 segs 也没有进一步处理的必要了，直接退出
  if (!event["segs"]) {
    return;
  }
  for (var i = 0; i < event["segs"].length; i++) {
    var seg = event["segs"][i];
    var word = process_word(seg["utf8"]);
    if (word) {
      array.push(word);
    }
  }
}

function fmt_segs(segs) {
  ret = [];
  for (var i = 0; i < segs.length; i++) {
    if (i == 0) {
      ret.push(segs[i]);
    } else {
      ret.push(" " + segs[i]);
    }
  }
  return ret;
}

// 去除两边空格
function process_word(word) {
  w = word.trim();
  return w;
}

// 下载自动字幕的中英双语
// 输入: file_name: 保存的文件名
// 输出: 无 (会触发浏览器下载一个文件)
async function download_auto_subtitle(file_name) {
  // 1. English Auto Sub in json3 format
  var auto_sub_url = get_auto_subtitle_xml_url();
  var format_json3_url = auto_sub_url + "&fmt=json3";
  var en_auto_sub = await get(format_json3_url); // 格式参考 Youtube-Subtitle-Downloader/fmt=json3/en.json
  console.log(en_auto_sub);
  // downloadString(JSON.stringify(en_auto_sub), "text/plain", "english.json");

  // 2. 自动字幕的翻译中文
  var cn_url = format_json3_url + "&tlang=zh-Hans";
  var cn_auto_sub = await get(cn_url);
  // downloadString(JSON.stringify(cn_auto_sub), "text/plain", "cn.json");

  var cn_srt = await url_json_srt(cn_url); // 格式参考 Youtube-Subtitle-Downloader/fmt=json3/zh-Hans.json

  // match_srt_old(en_auto_sub, cn_srt)
  match_srt_new(en_auto_sub, cn_srt); //新的匹配方法

  var srt_string = auto_sub_dual_language_to_srt(cn_srt); // 结合中文和英文
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

  var result_array = [];
  for (let i = 0; i < srt_array.length; i++) {
    const line = srt_array[i];
    var text = line.text + NEW_LINE + line.words.join(""); // 中文 \n 英文
    var item = {
      startTime: line.startTime,
      endTime: line.endTime,
      text: text,
    };
    result_array.push(item);
  }

  var srt_string = object_array_to_SRT_string(result_array);
  return srt_string;
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
  return (
    ($hours < 10 ? "0" : "") +
    $hours +
    ":" +
    ($minutes < 10 ? "0" : "") +
    $minutes +
    ":" +
    ($seconds < 10 ? "0" : "") +
    $seconds +
    "," +
    ($milliseconds < 100 ? "0" : "") +
    ($milliseconds < 10 ? "0" : "") +
    $milliseconds
  );
}
