// ==UserScript==
// @name        Youtube Auto Subtitle Downloader v5
// @description  download youtube AUTO subtitle
// @include      http://www.youtube.com/watch?*
// @include      https://www.youtube.com/watch?*
// @require      http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.9.1.min.js
// @version      5
// @namespace https://greasyfork.org/users/5711
// ==/UserScript==

// Author : Cheng Zheng
// Author Email : guokrfans@gmail.com
// Author Github : https://github.com/1c7
// Last update  :  2016/8/20

// 作者 : 郑诚
// 邮箱 : guokrfans@gmail.com
// Github : https://github.com/1c7
// 最近一次升级 : 2016/8/20

// Page first time load
$(document).ready(function(){  init(); });

// Page jump
window.addEventListener("spfdone", function(e) { init(); });

function init(){
    //  加按钮
    $("#eow-title").append('<a id="YT_auto"> Download Youtube Auto Subtitle | 下载 Youtube 自动字幕</a>');

    //  调样式
    $("#YT_auto").addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip'); // 样式是 Youtube 自带的.
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

    // 鼠标悬浮时改背景颜色;
    $("#YT_auto").hover(function() {
        $(this).css("background-color","rgb(0, 163, 80)")
            .css("border","1px solid rgb(0, 183, 90)");
    });
    $("#YT_auto").mouseout(function() {
        $(this).css("background-color","#00B75A");
    });

    var TITLE = unsafeWindow.ytplayer.config.args.title; // 拿视频标题
    var version = getChromeVersion(); // 拿 Chrome 版本

    // 判断 Chrome 版本来做事，Chrome 52 和 53 的文件下载方式不一样, 总不能为了兼顾 53 的让 52 的用户用不了
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

function get_subtitle(){
    var TTS_URL = unsafeWindow.yt.getConfig('TTS_URL');   // 拿 youtube 的 TTS_URL.
    if (!TTS_URL){
        $("#YT_auto").text("No Auto Subtitle | 没有英文自动字幕");
        return false;
    }

    var xml = TTS_URL + "&type=track" + "&lang=en" + "&name" + "&kind=asr";
    // 拼xml字幕链接地址

    var a = "<content will be replace>";

    $.ajax({
        url: xml,
        type: 'get',
        async: false,
        success: function(r) {
            if(r === ""){
                $("#YT_auto").text("No Auto Subtitle | 没有英文自动字幕");
                return false;
            }
            var text = r.getElementsByTagName('text');
            // 拿到所有的text节点
            var result = "";
            // 保存结果的字符串
            for(var i=0; i<text.length; i++){
                var index = i+1;
                // 这个是字幕的索引, 从1开始的, 但是因为我们的循环是从0开始的, 所以加个1
                var content = text[i].textContent;
                // 字幕内容
                var start = text[i].getAttribute('start');
                // 获得开始时间, 比如start="7.97", 我们现在就获得了7.97
                var dur = text[i].getAttribute('dur');
                // 获得持续时间, 比如dur="3.75", 我们现在就获得了3.75

                // ==== 开始处理数据, 把数据保存到result里. ====
                result = result + index + '\r\n';
                // 把序号加进去

                var start_time = process_time( parseFloat(start) );
                result = result + start_time;
                // 拿到 开始时间 之后往result字符串里存一下

                result = result + ' --> ';
                // 标准 srt 时间轴: 00:00:01,850 --> 00:00:02,720
                // 我们现在加个中间的箭头..

                var end_time = process_time( parseFloat(start) + parseFloat(dur) );
                result = result + end_time + ' \r\n';
                // 拿到 结束时间 之后往result字符串里存一下

                result = result + content + '\r\n\r\n';
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
            a = result;
        }
    });
    return a;
}

// 复制自： http://www.alloyteam.com/2014/01/use-js-file-download/
// Chrome 53 之后这个函数失效。52有效。
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
