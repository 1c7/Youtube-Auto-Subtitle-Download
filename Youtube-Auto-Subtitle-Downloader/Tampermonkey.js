// ==UserScript==
// @name        Youtube Auto Subtitle Downloader
// @description  download youtube AUTO subtitle.
// @include      http://www.youtube.com/watch?*
// @include      https://www.youtube.com/watch?*
// @require      http://ajax.aspnetcdn.com/ajax/jQuery/jquery-1.9.1.min.js
// ==/UserScript==


// Author : Cheng Zheng
// Author Email : guokrfans@gmail.com
// Author Github : https://github.com/1c7
// Last update  :  2014/9/29

// 作者 : 郑诚
// 作者邮箱 : guokrfans@gmail.com
// 作者 Github : https://github.com/1c7
// 作者微博 : @糖醋陈皮 ( http://weibo.com/p/1005052004104451 )
// 最近一次升级 : 2014/9/29

$(document).ready(function(){
    
    //------------------------------------
    //
    //  往页面上加个按钮
    //
    //------------------------------------
    $("#eow-title")
    .append('<a id="YT_auto">Download Youtube Auto Subtitle | 下载Youtube自动字幕</a>');

    
    
    //------------------------------------
    //
    //  调整一下样式
    //
    //------------------------------------
    $("#YT_auto").addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip'); // 这些样式是Youtube自带的.
    
    $("#YT_auto").css('margin-top','2px');  
    $("#YT_auto").css('margin-left','4px'); 
    // 有点没对齐..加点边距对齐一下..
    $("#YT_auto").css('border','1px solid rgb(0, 183, 90)');
    $("#YT_auto").css('cursor','pointer');
    $("#YT_auto").css('color','rgb(255, 255, 255)');
    $("#YT_auto").css('border-top-left-radius','3px');
    $("#YT_auto").css('border-top-right-radius','3px');
    $("#YT_auto").css('border-bottom-right-radius','3px');
    $("#YT_auto").css('border-bottom-left-radius','3px');
    $("#YT_auto").css('background-color','#00B75A');
    // 为了美观的 css 样式

    $("#YT_auto").hover(function() {
       $(this).css("background-color","rgb(0, 163, 80)");
       $(this).css("border","1px solid rgb(0, 183, 90)");
    });
    // 鼠标悬浮时改变一下背景颜色;
    
    $("#YT_auto").mouseout(function() {
       $(this).css("background-color","#00B75A");
    });
    
    
    //------------------------------------
    //
    //  点击就下载
    //
    //------------------------------------
    $("#YT_auto").click(function(){
        download_subtitle();
    });


});






function download_subtitle(){
    
    var TTS_URL = unsafeWindow.yt.getConfig('TTS_URL');
    // 拿到youtube代码里的TTS_URL值.
    
    var TITLE = unsafeWindow.ytplayer.config.args.title;
    // 拿到视频标题
    
    if (!TTS_URL){
        $("#YT_auto").text("Can't Find Any Auto Subtitle | 没有英文自动字幕");
        throw "No Subtitle | 没字幕";
    }
    // 拿不到xml字幕地址的话
    // 就在console里面说一声, 
    // 界面按钮上通知一下, 然后通过throw退出.
    // 用throw退出没啥特殊理由..就是看到这样管用而已.
    

    var xml = TTS_URL + "&type=track" + "&lang=en" + "&name" + "&kind=asr";
    // 拼xml字幕链接地址

    
    
    $.get(xml).done(function(ret){
        if(ret === ""){
            $("#YT_auto").text("Can't Find Any Auto Subtitle | 没有英文自动字幕");
            throw "No Subtitle | 没字幕";
        }
    });
    // 之前的几行是通过判断 TTS_URL，判断视频有没有自动字幕
    // 但我发现有的视频有 TTS_URL 但拼接xml字幕地址并访问后是空的。 所以我们这里多加一道 判断下返回的内容是否为空。
    
                    

    $.get(xml).done(function(r){ 
        
        
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
            result = result + index + '\n';
            // 把序号加进去
            
            
            
            var start_time = process_time( parseFloat(start) );
            result = result + start_time;
            // 拿到 开始时间 之后往result字符串里存一下
            
            
            
            result = result + ' --> ';
            // 标准srt时间轴: 00:00:01,850 --> 00:00:02,720
            // 我们现在加个中间的箭头..
            
            
            
            var end_time = process_time( parseFloat(start) + parseFloat(dur) );
            result = result + end_time + ' \n';
            // 拿到 结束时间 之后往result字符串里存一下
            
      
            result = result + content + '\n\n';
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
        
        downloadFile(TITLE+".srt",result);

    });
    
    
    
}



// 下面这个函数不是我写的。我之前写的那种下载方法在 Chrome 更新之后失效了。不能指定下载时的文件名。
// 后来搜索了下找到这个解决方案就直接复制过来用了。
// 复制自： http://www.alloyteam.com/2014/01/use-js-file-download/
function downloadFile(fileName, content){
    var aLink = document.createElement('a');
    var blob = new Blob([content]);
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("click", false, false);
    aLink.download = fileName;
    aLink.href = URL.createObjectURL(blob);
    aLink.dispatchEvent(evt);
}


// 处理时间. 比如 start="671.33"  start="37.64"  start="12" start="23.029"
// 我们处理成srt的时间, 比如 00:00:00,090    00:00:08,460    00:10:29,350
function process_time(s){
    
    s = s.toFixed(3);
    // 超棒的函数, 可以把不论是整数还是小数它都给你弄成3位小数形式的数字.
    // 举个柚子: 
    // 671.33 -> 671.330
    // 671 -> 671.000
    // 注意, 这个函数会四舍五入. 具体可以去读文档

    
    var array = s.split('.');
    // 把开始时间根据句号分割
    // 671.330 会分割成数组: [671, 330]
    

    var Hour = 0;
    var Minute = 0;
    var Second = array[0];   // 671
    var MilliSecond = array[1];  // 330
    // 先声明一下变量, 待会把这几个拼好就行了。

        
        
    // 我们来处理秒数.  把"分钟"和"小时"除出来。
    if(Second >= 60){

        Minute = Math.floor(Second / 60);
        Second = Second - Minute * 60;
        // 我们把 秒 拆成 分钟和秒, 比如121秒, 拆成2分钟1秒    

        Hour = Math.floor(Minute / 60);
        Minute = Minute - Hour * 60;
        // 我们把 分钟 拆成 小时和分钟, 比如700分钟, 拆成11小时40分钟    
        
    } 
        
        
    // 处理分钟，如果位数不够两位就变成两位，下面两个if语句的作用也是一样。
    if (Minute < 10){
        Minute = '0' + Minute;
    }       
        
    // 处理小时
    if (Hour < 10){
        Hour = '0' + Hour;
    }
  
    // 处理秒
    if (Second < 10){
        Second = '0' + Second;
    }

    return Hour + ':' + Minute + ':' + Second + ',' + MilliSecond;
}