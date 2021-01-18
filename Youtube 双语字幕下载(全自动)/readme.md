## Youtube 双语字幕下载(全自动)

这个 "Youtube 双语字幕下载(全自动)" 和 "Youtube 双语字幕下载" 在功能上是完全一样的。    
唯一的区别是打开页面后 "Youtube 双语字幕下载(全自动)" 会马上自动下载。    

这个脚本的用户主要是那些下载量特别大的人（200+）

下载的优先级（从高到低）：
1. 英文的 closed 字幕
2. 英文的 auto 字幕
3. 如果英文的完全没有，那么直接下载第一个字幕（不管是什么语言，不管是不是自动字幕），下载完就结束了


## https://www.youtube.com/watch?v=ndEH1yHs3do
触发自动字幕(英语) 打开时，会有如下请求
```
https://www.youtube.com/api/timedtext?v=ndEH1yHs3do&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&exp=xftt&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1611016163&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cexp%2Cxorp%2Cxoaf&signature=53B9680F33650F001D88BE3F3D225D7BA40B732C.2BF66391D944A584299E1201B9BE87A3AFC9C336&key=yt8&kind=asr&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3
```

自动翻译成中文时，会404报错，但是 url 如下:
```
https://www.youtube.com/api/timedtext?v=ndEH1yHs3do&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&exp=xftt&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1611016163&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cexp%2Cxorp%2Cxoaf&signature=53B9680F33650F001D88BE3F3D225D7BA40B732C.2BF66391D944A584299E1201B9BE87A3AFC9C336&key=yt8&kind=asr&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3&tlang=zh-Hans
```

2021-1-19 02:05 搞清楚了是 Youtube 他们出了问题
假设不用我这个脚本，就一步步正常使用，也会得到 404，所以是谷歌的服务出问题了
这个要等待他们修复，我这边是修不好的，