// ==UserScript==
// @name           Youtube Subtitle Downloader
// @include        http://*youtube.com/watch*
// @include        https://*youtube.com/watch*
// @author         Tim Smart
// @copyright      2009 Tim Smart; 2011 gw111zz; 2013 Cheng Zheng;
// @license        GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @version       0.2
// @namespace https://greasyfork.org/users/5711
// @description download youtube COMPLETE subtitle
// ==/UserScript==



// Thrid Author : Cheng Zheng, 
// Email : guokrfans@gmail.com
// Last update :  2014/9/29



var PLAYER              = unsafeWindow.document.getElementById('movie_player'),
    VIDEO_ID            = unsafeWindow.ytplayer.config.args.video_id,
    TITLE               = unsafeWindow.ytplayer.config.args.title,
    caption_array = [];



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





// 下载字幕用的函数.
function download_subtitle (selector) {

    var caption = caption_array[selector.selectedIndex - 1];
    if (!caption) return;
    language_name_1c7 = caption.lang_name;

    
    var url = 'https://video.google.com/timedtext?hl=' + caption.lang_code 
                          + '&lang=' + caption.lang_code 
                          + '&name=' + caption.name 
                          + '&v=' + VIDEO_ID;    
    
    // console.log(url);
    // 加了这句之后, 下载字幕时控制台会输出字幕的url地址.

    
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
            result = result + end_time + '\n';
            // 拿到 结束时间 之后往result字符串里存一下
            
            
            result = result + content + '\n\n';
            // 加字幕内容
            
        }
        
        
        result = result.replace(/&#39;/g, "'");
        // 字幕里会有html实体字符..所以我们替换掉
        


        var title =  '(' + language_name_1c7 + ')' + TITLE + '.srt';
        downloadFile(title,result);
		// 下载

            
            
    }).fail(function() { 
        alert("Error: No response from server.");
    });
    


    
    
    selector.options[0].selected = true;
    // 下载完之后把选项框选回第一个元素. 也就是 Download captions.
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




(function () {
    
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
    // 这个是用来载入有多少字幕的函数, 不是下载字幕的函数
    
    var a = document.createElement('a');
    a.style.cssText = 'display:none;';  
    a.setAttribute("id", "ForSubtitleDownload");
    var body = document.getElementsByTagName('body')[0];
    body.appendChild(a);
    // 这个元素用于下载.

})();



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
