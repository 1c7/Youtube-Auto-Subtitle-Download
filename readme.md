2015年7月26号更新，今天在 Gmail 收到用户反馈说格式有问题。  
应该是 Youtube 改了格式导致解析失败。5天内我会修复该问题。（最近忙 Sorry）  
<br>
中文安装教程:  http://www.zhihu.com/question/19647719/answer/16843974?group_id=789328566
<br>
<br>

### 可以改进的点：
  1. Firefox 兼容
  2. 做成 Chrome 扩展和 Firefox 扩展。免得让用户装了 Tempermonkey 再装脚本
  3. 优化 Youtube Ajax 载入导致的下载按钮消失问题。监听刷新时间，比如监测视频标题是不是变了，一变我们就再注入一次。免得用户要手动刷新

我列出来但是不自己做主要是忙，有空会做。（估计是没空）欢迎fork并且改进。如果你担心做完之后发现我提前你俩小时更新了脚本做到了同样的效果从而导致蛋蛋剧痛。那么可以先发个 Issue 给我。我会回复你的……

---

<br>

### English 
First, you need use [Chrome](https://www.google.com/chrome/browser/) and [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo?utm_source=chrome-ntp-icon) (it's a Chrome extension)    


Then:

https://greasyfork.org/scripts/5368-youtube-subtitle-downloader    
(download youtube COMPLETE subtitle)   

https://greasyfork.org/scripts/5367-youtube-auto-subtitle-downloader    
(download youtube AUTO subtitle)   


<br>
#### Remember  
If you didn't see download button appear on Youtube video play page.   
__Refresh__


<br>
#### after install both program, it look like this:  
![after install](img_for_readme.png)    



