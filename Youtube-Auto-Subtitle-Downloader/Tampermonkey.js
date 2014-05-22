// ==UserScript==
// @name        Youtube Auto Subtitle Downloader
// @description  Help you download Youtube Auto Subtitle.
// @include      http://www.youtube.com/watch?*
// @include      https://www.youtube.com/watch?*
// @require      http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==


// Author: Cheng Zheng
// Author Email: guokrfans@gmail.com
// Author Github: https://github.com/1c7

// 作者: 郑诚
// 作者邮箱: guokrfans@gmail.com
// 作者微博: @糖醋陈皮 ( http://weibo.com/p/1005052004104451 )
// 作者 Github: https://github.com/1c7


$(document).ready(function(){
    
    $('#watch7-sentiment-actions')
    .append('<a id="YT_auto">Download Youtube Auto Subtitle | 下载Youtube自动字幕</a>');
    // 往页面上加个按钮
    
    
    $("#YT_auto").addClass('start yt-uix-button yt-uix-button-text yt-uix-tooltip');
    // 样式, 这些样式是Youtube自带的.
    
    $("#YT_auto").css('margin-top','2px');  
    $("#YT_auto").css('margin-left','4px'); 
    // 有点没对齐..加点边距对齐一下..
  
    
    set_button_href();

});






// 拿到xml字幕url并发给后台的函数
function set_button_href(){
    
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
        

        
        
        document.getElementById('YT_auto').setAttribute(
            'download',
            '(auto)' + TITLE + '.srt'
        );
        // 设置文件名, 别问我为什么这样能成功, 我也不知道...不过他就是管用....囧..

        
        document.getElementById('YT_auto').setAttribute(
            'href',
            'data:Content-type: text/plain, ' + escape(result)
        );
        // 开始下载
        
        
        
    });
    
    
    
}






// 处理时间. 比如 start="671.33"  start="37.64"  start="12" start="23.029"
// 我们处理成srt的时间, 比如 00:00:00,090    00:00:08,460    00:10:29,350
function process_time(s){
    
    s = s.toFixed(3);
    // 超棒的函数, 可以把不论是整数还是小数它都给你弄成3位小数形式的数字.
    // 输入12, 输出12.000
    // 注意, 这个函数会四舍五入. 具体可以去读文档
    
    
    var array = s.split('.');
    // 把开始时间根据句号分割
    // start="671.33" 会分割成数组: [671, 33]
    

    
    var Hour = 0;
    var Minute = 0;
    var Second = array[0];
    var MilliSecond = array[1];
    // 待会把这几个拼好就行, 先声明一下, 
    // 最后格式是这样的: 00:00:00,090    00:00:08,460    00:10:29,350
    
    
    
    
    
    
    
    
    
    // 我们来处理毫秒, 如果毫秒的长度小于3. 我们就加0给它补成三位数, 因为srt的字幕格式都是这样的: 00:00:00,090 --> 00:00:01,850
    // 最后的毫秒总是3个数字.
    if (getlength(MilliSecond) == 1){
        MilliSecond = '00' + MilliSecond;
    }
    else if(getlength(MilliSecond) == 2){
        MilliSecond = '0' + MilliSecond;
    }

        
        
    // 现在我们来处理秒数.
    // 示例数据: start="778.81   start="741.56"   start="0.59"
    // srt里秒数都是两位数的
    if (Second < 10){
        Second = '0' + Second;
    }
    else if(Second > 60){

        Minute = Math.floor(Second / 60);
        Second = Second - Minute * 60;
        // 我们把 秒 拆成 分钟和秒, 比如121秒, 拆成2分钟1秒    

        Hour = Math.floor(Minute / 60);
        Minute = Minute - Hour * 60;
        // 我们把 分钟 拆成 小时和分钟, 比如700分钟, 拆成11小时40分钟    
        
    } 
        
        
    // 现在我们来处理分钟
    if (getlength(Minute) == 1){
        Minute = '0' + Minute;
    }       
        
        
    // 现在我们来处理小时
    if (getlength(Hour) == 1){
        Hour = '0' + Hour;
    }
  

    
    
    // 我们再来处理一遍秒数, 因为现在的输出格式都是这样的:
    /*
    00:08:59,075
    00:09:3,022
    00:09:6,095
    00:09:10,045
    */
    
    if (getlength(Second) == 1){
        Second = '0' + Second;
    }

    
        
       
    return Hour + ':' + Minute + ':' + Second + ',' + MilliSecond;
    // 返回最后的结果
}






// 获得数字的长度...
// 比如输入0000, 返回4.
function getlength(number) {
    return number.toString().length;
}






