// ==UserScript==
// @name           Youtube Subtitle Downloader
// @include        http://*youtube.com/watch*
// @include        https://*youtube.com/watch*
// @author         Tim Smart
// @copyright      2009 Tim Smart; 2011 gw111zz; 2013 1c7(郑诚);
// @license        GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html
// @require        http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// ==/UserScript==


var PLAYER              = unsafeWindow.document.getElementById('movie_player'),
    VIDEO_ID            = unsafeWindow.yt.getConfig('VIDEO_ID'),
    TITLE               = unsafeWindow.ytplayer.config.args.title,
    caption_array = [];




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







// 下载字幕用的函数.
function download_subtitle (selector) {
    
    var caption = caption_array[selector.selectedIndex - 1];
    if (!caption) return;
    language_name_1c7 = caption.lang_name;

    
    var url = 'http://video.google.com/timedtext?hl=' + caption.lang_code 
                          + '&lang=' + caption.lang_code 
                          + '&name=' + caption.name 
                          + '&v=' + VIDEO_ID;    

    
    $.get(url).done(function(r){ 
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
        
        
        
        
        
        result = result.replace(/&#39;/g, "'");
        // 字幕里会有html实体字符..所以我们替换掉
        

        // ----------------------------------------------------------------
        
        
        var for_download_a_tag = document.getElementById('ForSubtitleDownload');
        
        var title =  '(' + language_name_1c7 + ')' + TITLE + '.srt';
        for_download_a_tag.setAttribute("download", title);
        for_download_a_tag.setAttribute( "href", "data:text/plain;charset=utf-8," + escape(result)  );
        // 拿到那个用于下载的a标签 并设置2个属性, result必须escape不然文件里会没有换行符
        
        
        // http://stackoverflow.com/questions/7914684/trigger-right-click-using-pure-javascript
        if (document.createEvent) {
            var ev = document.createEvent('HTMLEvents');
            ev.initEvent('click', true, false);
            for_download_a_tag.dispatchEvent(ev);
        }
        // 触发那个a标签的点击事件
        
        
        // ----------------------------------------------------------------

            
            
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
        url:    'http://video.google.com/timedtext?hl=en&v=' + VIDEO_ID + '&type=list',
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

    
    div.setAttribute( 'style', 'display: inline-block;' );
    
    select.id       = 'captions_selector';
    select.disabled = true;
    
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









