// ==UserScript==
// @name           Youtube Subtitle Downloader v8
// @include        http://*youtube.com/watch*
// @include        https://*youtube.com/watch*
// @author         Cheng Zheng
// @copyright      2009 Tim Smart; 2011 gw111zz; 2013~2016 Cheng Zheng;
// @license        GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version        8
// @grant GM_xmlhttpRequest
// @namespace https://greasyfork.org/users/5711
// @description download youtube COMPLETE subtitle
// ==/UserScript==

/*
    Third Author :  Cheng Zheng
    Email        :  guokrfans@gmail.com
    Last update  :  2016/Sep/12
    Github       :  https://github.com/1c7/Youtube-Auto-Subtitle-Download

    Code comments are written in Chinese. If you need help, just let me know.
*/

// Page first time load
(function () { init(); })();

// Page jump
window.addEventListener("spfdone", function(e) { init(); });

function init(){
    unsafeWindow.VIDEO_ID            = unsafeWindow.ytplayer.config.args.video_id;
    unsafeWindow.caption_array       = [];
    inject_our_script();
}

function inject_our_script(){
    var div      = document.createElement('div'),
        select   = document.createElement('select'),
        option   = document.createElement('option'),
        controls = document.getElementById('watch7-headline');  // 装视频标题的div

    div.setAttribute( 'style', 'margin-bottom: 10px; display: inline-block; border: 1px solid rgb(0, 183, 90); cursor: pointer; color: rgb(255, 255, 255); border-top-left-radius: 3px; border-top-right-radius: 3px; border-bottom-right-radius: 3px; border-bottom-left-radius: 3px; background-color: #00B75A;margin-left: 4px; ');

    select.id       = 'captions_selector';
    select.disabled = true;
    select.setAttribute( 'style', 'border: 1px solid rgb(0, 183, 90); cursor: pointer; color: rgb(255, 255, 255); background-color: #00B75A;');

    option.textContent = 'Loading...';
    option.selected    = true;

    select.appendChild(option);
    // 添加这个选项, 这个选项默认被选中, 文字是"Loading..."

    select.addEventListener('change', function() {
        download_subtitle(this);
    }, false);
    // 事件侦听.

    div.appendChild(select);
    // 往新建的div里面放入select

    controls.appendChild(div);
    // 往页面上添加这个div

    load_language_list(select);
    // 用来载入有多少字幕的函数, 不是下载字幕的函数

    var a = document.createElement('a');
    a.style.cssText = 'display:none;';
    a.setAttribute("id", "ForSubtitleDownload");
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(a);// 这个元素用于下载.
}

// 下字幕用的函数.
function download_subtitle (selector) {
    var caption = caption_array[selector.selectedIndex - 1];
    if (!caption) return;
    var language_name_1c7 = caption.lang_name;

    var url = 'https://video.google.com/timedtext?hl=' + caption.lang_code + '&lang=' + caption.lang_code + '&name=' + caption.name + '&v=' + VIDEO_ID;

    jQuery.get(url).done(function(r){
        var text = r.getElementsByTagName('text');
        // 拿到所有的text节点
        var result = "";
        // 保存结果的字符串
        for(var i=0; i<text.length; i++){
            var index = i+1;
            // 这个是字幕的索引, 从1开始的, 但是因为我们的循环是从0开始的, 所以加个1
            var content = text[i].textContent.replace(/\n/g, " ");
            // content 保存的是字幕内容 - 这里把换行换成了空格, 因为 Youtube 显示的多行字幕中间会有个\n, 如果不加这个replace. 两行的内容就会黏在一起.
            var start = text[i].getAttribute('start');
            var end = $(text[i+1]).attr('start');
            if(!end){
                end = start + 5;
            }
            // ==== 开始处理数据, 把数据保存到result里. ====
            result = result + index + escape('\r\n');
            // 把序号加进去
            var start_time = process_time( parseFloat(start) );
            result = result + start_time;
            // 拿到 开始时间 之后往result字符串里存一下
            result = result + ' --> ';
            // 标准srt时间轴: 00:00:01,850 --> 00:00:02,720
            // 我们现在加个中间的箭头..
            var end_time = process_time( parseFloat(end) );
            result = result + end_time + escape('\r\n');
            // 拿到 结束时间 之后往result字符串里存一下
            result = result + content + escape('\r\n\r\n');
            // 加字幕内容
        }
        result = result.replace(/&#39;/g, "'");
        // 字幕里会有html实体字符..所以我们替换掉

        var title =  '(' + language_name_1c7 + ')' + unsafeWindow.ytplayer.config.args.title + '.srt';
        downloadFile(title, result);
        // 下载

    }).fail(function() {
        alert("Error: No response from server.");
    });

    selector.options[0].selected = true;
    // 下载完把选项框选回第一个元素. 也就是 Download captions.
}

// 载入字幕有多少种语言的函数, 然后加到那个选项框里
function load_language_list (select) {
    GM_xmlhttpRequest({
        method: 'GET',
        url:    'https://video.google.com/timedtext?hl=en&v=' + VIDEO_ID + '&type=list',
        onload: function( xhr ) {
            var caption, option, caption_info,
                captions = new DOMParser().parseFromString(xhr.responseText, "text/xml").getElementsByTagName('track');
            if (captions.length === 0) {
                return select.options[0].textContent = 'No captions.';
            }
            for (var i = 0, il = captions.length; i < il; i++) {
                caption      = captions[i];
                option       = document.createElement('option');
                caption_info = {
                    name:      caption.getAttribute('name'),
                    lang_code: caption.getAttribute('lang_code'),
                    lang_name: caption.getAttribute('lang_translated')
                };
                caption_array.push(caption_info);
                option.textContent = caption_info.lang_name;
                select.appendChild(option);
            }
            select.options[0].textContent = 'Download captions.';
            select.disabled               = false;
        }
    });
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

function downloadFile(fileName, content){
    var TITLE = unsafeWindow.ytplayer.config.args.title; // 拿视频标题
    var version = getChromeVersion(); // 拿 Chrome 版本

    // dummy element for download
    if ($('#youtube-subtitle-downloader-dummy-element-for-download').length > 0) {
    }else{
        $("body").append('<a id="youtube-subtitle-downloader-dummy-element-for-download"></a>');
    }
    var dummy = $('#youtube-subtitle-downloader-dummy-element-for-download');

    // 判断 Chrome 版本来做事，Chrome 52 和 53 的文件下载方式不一样, 总不能为了兼顾 53 的让 52 的用户用不了
    if (version > 52){
        dummy.attr('download', fileName);
        dummy.attr('href','data:Content-type: text/plain,' + content);
        dummy[0].click();
    } else {
        downloadViaBlob(fileName, content);
    }
}

// 复制自： http://www.alloyteam.com/2014/01/use-js-file-download/
// Chrome 53 之后这个函数失效。52有效。
function downloadViaBlob(fileName, content){
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
