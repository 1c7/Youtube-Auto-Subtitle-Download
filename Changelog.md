## 2016-4-11 更新了 Youtube Subtitle Downloader v3
修复了只显示 loading 无法下载字幕的问题：因为 Tampermonkey 升级导致权限收紧，加多一行代码把网络权限申请一下就好了。

## 2016-08-20 俩程序都更新了
现在跳转页面，下载按钮再也不会消失了。


## 2016-09-02 Chrome 52 更新到 53 之后程序失效。
主要是下载到文件的方式失效了，修复方法是判断 Chrome 版本，
52：用老方法
53：用 a 标签的 download


## 2016-09-19 解决中文乱码问题，原因是我对整个内容进行了一次 escape，做 escape 操作的原因是英文不换行，escape 之后换行就好了，但是当时没测中文（大错误）。
中文 escape 之后就"乱码"了。正确的做法是只 escape('\r\n) 而不是整个内容。
已修复中文乱码问题，现在的版本是 Youtube Subtitle Downloader v8。
Auto subtitle 由于只有英文，所以整体 escape 不会造成问题，因为英文不会乱码。

## 2017-01-26 用户反映自动字幕无法下载
我试了下还真是嘿。  
看了下是 Youtube 改字幕格式了。耸肩，没办法。  
把解析格式的那部分代码重写下就好了。  

<br/>
<br/>
#### 脚注：
如果换行的处理不行，试试这个：
```
$(".YT_auto").attr('href','data:Content-type: text/plain,' + r.replace(/\n/g, '%0D%0A') );
```

反正这个对我管用。
