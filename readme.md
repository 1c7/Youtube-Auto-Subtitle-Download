# Download Youtube Subtitle

### After install, it Look like this:
(Yep, two program, one for auto subtitle, one for complete subtitle.)
![1](img_for_readme.png)

## Usage
First, you need use [Chrome](https://www.google.com/chrome/browser/)(Web browser) and [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?utm_source=chrome-ntp-icon) (Tampermonkey is a Chrome extension)


Then, Open these 2 link below and Install both script:

[Youtube Subtitle Downloader](https://greasyfork.org/scripts/5368-youtube-subtitle-downloader-v2)<br/>
[Youtube Auto Subtitle Downloader](https://greasyfork.org/scripts/5367-youtube-auto-subtitle-downloader)<br/>

You would saw this (Click green "Install this script" button to install):  
![2](install-1.png)

After click green button, you would saw this (click the little "Install" button again to confirm):  
![3](install.png)

Thanks for using this. I hope it save your time.    
Have a nice day ;)    



<br/>
### Contributor (Thanks!)
[@cnbeining](https://github.com/cnbeining)    
[@772807886](https://github.com/772807886)   
[@sterpe](https://github.com/sterpe)


<br>
### Youtube 字幕下载工具  (Usage description in Chinese)

这里 2 个工具都是用来下载 Youtube 字幕的.  
安装和使用可参照:
http://www.zhihu.com/question/19647719/answer/16843974?group_id=789328566  
感谢使用，新春愉快。

<br>
### Reference(Thank you!)  
https://github.com/sterpe/yt-timedtext2srt

<br>
### 整体逻辑 Overall code logic
其实代码的整体逻辑就是利用 Tampermonkey 可以注入到页面，从而读到页面里的 js 变量这样的优势。    
直接从 yt 里面读取到自动字幕的地址，然后做一个格式转换就行了（不管 Youtube 给的什么格式，想办法转成标准的 SRT 格式即可）  
