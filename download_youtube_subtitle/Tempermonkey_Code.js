// ==UserScript==
// @name           Download YouTube Captions
// @namespace      http://userscripts.org/users/tim
// @include        http://*youtube.com/watch*
// @include        https://*youtube.com/watch*
// @author         Tim Smart
// @copyright      2009 Tim Smart; 2011 gw111zz
// @license        GNU GPL v3.0 or later. http://www.gnu.org/copyleft/gpl.html

// ==/UserScript==

var PLAYER              = unsafeWindow.document.getElementById('movie_player'),
    VIDEO_ID            = unsafeWindow.yt.getConfig('VIDEO_ID'),
    TITLE               = unsafeWindow.ytplayer.config.args.title,
    caption_array = [];



var makeTimeline = function (time) {
  var string,
      time_array   = [],
      milliseconds = Math.round(time % 1 * 1000).toString();

  while (3 > milliseconds.length) {
    milliseconds = '0' + milliseconds;
  }

  time_array.push(Math.floor(time / (60 * 60)));
  time_array.push(Math.floor((time - (time_array[0] * 60 * 60)) / 60));
  time_array.push(Math.floor(time - ((time_array[1] * 60) + (time_array[0] * 60 * 60))));

  for (var i = 0, il = time_array.length; i < il; i++) {
    string = '' + time_array[i];

    if (1 === string.length) {
      time_array[i] = '0' + string;
    }
  }

  return time_array.join(":") + "," + milliseconds;
}



// 下载字幕用的函数.
function loadCaption (selector) {
  var caption = caption_array[selector.selectedIndex - 1];

  if (!caption) return;

  GM_xmlhttpRequest({
    method: 'GET',
    url: 'http://video.google.com/timedtext?hl=' + caption.lang_code +
         '&lang=' + caption.lang_code + '&name=' + caption.name + '&v=' + VIDEO_ID,
    onload:function(xhr) {
      if (xhr.responseText !== "") {
        var caption, previous_start, start, end,
            captions      = new DOMParser().parseFromString(xhr.responseText, "text/xml").getElementsByTagName('text'),
            textarea      = document.createElement("textarea"),
            srt_output    = ''; 

        for (var i = 0, il = captions.length; i < il; i++) {
          caption = captions[i];
          start   = +caption.getAttribute('start');

          if (0 <= previous_start) {
            textarea.innerHTML = captions[i - 1].textContent.replace(/</g, "&lt;").
                                                             replace( />/g, "&gt;" );

            srt_output += (i + 1) + "\n" + makeTimeline(previous_start) + ' --> ' +
                            makeTimeline(start) + "\n" + textarea.value + "\n\n";
            
            previous_start = null;
          }

          if (end = +caption.getAttribute('dur')) {
            end = start + end;
          } else {
            if (captions[i + 1]) {
              previous_start = start;
              continue;
            }
            end = PLAYER.getDuration();
          }

          textarea.innerHTML = caption.textContent.replace(/</g, "&lt;").replace(/>/g, "&gt;");

            srt_output   += (i + 1) + "\n" + makeTimeline(start) + ' --> ' +
                                makeTimeline(end) + "\n" + textarea.value + "\n\n";
          
        }

        textarea = null;


          
          // ----------------------------------------------------------------
          var a = document.createElement('a');
          // create <a> tag
          
          a.style.cssText = 'display:none;';  
          // set not display
          
          a.setAttribute("id", "ForSubtitleDownload");
          // set id
          
          a.setAttribute("download", TITLE + '.srt');
          // set download file name.. don't ask me why this work... i don't know too...
          
          a.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(srt_output));
          // set href
          
          var body = document.getElementsByTagName('body')[0];
          // get <body> tag
          
          body.appendChild(a);
          // append the <a> tag into <body>
          
          
          var for_download_a_tag = document.getElementById('ForSubtitleDownload');
          // get the <a> tag
          
          
          
          // http://stackoverflow.com/questions/7914684/trigger-right-click-using-pure-javascript
          if (document.createEvent) {
                var ev = document.createEvent('HTMLEvents');
                ev.initEvent('click', true, false);
                for_download_a_tag.dispatchEvent(ev);
          }
          // fire click event.
          
          
          // ----------------------------------------------------------------
          
          
      } else {
        alert("Error: No response from server.");
      }

      selector.options[0].selected = true;

    }
  });
}


// 载入字幕有多少种语言的函数, 然后加到那个选项框里
function loadCaptions (select) {
    
  GM_xmlhttpRequest({
    method: 'GET',
    url:    'http://video.google.com/timedtext?hl=en&v=' + VIDEO_ID + '&type=list',
    onload: function( xhr ) {

      var caption, option, caption_info,
          captions = new DOMParser().parseFromString(xhr.responseText, "text/xml").
                                     getElementsByTagName('track');
                                
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
      controls = document.getElementById('watch7-headline');
  // 创建3个元素.
  // controls = 拿装视频标题的div

  div.setAttribute( 'style', 'display: inline-block;' );

  select.id       = 'captions_selector';
  select.disabled = true;

  option.textContent = 'Loading...';
  option.selected    = true;

  select.appendChild(option);
  // 添加这个选项, 这个选项默认被选中, 文字是"Loading..."  
    
  select.addEventListener('change', function() {
      loadCaption(this);
  }, false);
   // 事件侦听.
    
  div.appendChild(select);
  // 往新建的div里面放入select

  controls.appendChild(div);
    // 往页面上添加这个div
  
  loadCaptions(select);
  // 这个是用来载入有多少字幕的函数, 不是下载字幕的函数
    
    
})();


