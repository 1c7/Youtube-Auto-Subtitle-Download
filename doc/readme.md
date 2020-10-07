## 文档

## 项目历史-简单说明
原本是2个脚本，一个脚本下载"自动字幕"，一个脚本下载"完整字幕"   
但是很多人不知道，   
然后给那个下载"完整字幕"的进行了差评，因为不能下载自动字幕，    
后来我只好把这俩融合到一起
（其实早就应该融合，只是因为做这个根本没钱赚，只能看有多少空闲时间+有没有心情做这个）   


## 获取字幕的核心点
```
var raw_string = ytplayer.config.args.player_response;
json = JSON.parse(raw_string);
```

## 翻译的时候，发出的请求是什么？
https://www.youtube.com/watch?v=n1zpnN-6pZQ&t=11s


### 原始英文：
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3

### 中文： tlang=zh-Hans
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3&tlang=zh-Hans

对于这样的完整字幕，时间轴是 match 的。没有问题。

## 自动字幕

### 英文
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3

### 中文
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3&tlang=zh-Hans

英文的是一个个的词 (json 格式)
中文的是一句句话 (json 格式)
不同的。

### 英文这个 fmt 可以换成 vtt
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=vtt&xorb=2&xobt=3&xovt=3

换成 srt 以及 json 不成功。（原先是 json3 格式)

https://developers.google.com/youtube/v3/docs/captions/download
根据文档似乎有这4种
sbv – SubViewer subtitle
scc – Scenarist Closed Caption format
srt – SubRip subtitle
ttml – Timed Text Markup Language caption
vtt – Web Video Text Tracks caption

## 成功，tfmt=sbv
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&tfmt=sbv&xorb=2&xobt=3&xovt=3

## 如果再加个中文呢？加上 tlang=zh-Hans
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&tfmt=sbv&xorb=2&xobt=3&xovt=3&tlang=zh-Hans

可以是可以，只是 timestamp 完全不 match


## 换一个格式试试 srt (tfmt=srt)
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&tfmt=srt&xorb=2&xobt=3&xovt=3
加了和没加一样。

甚至把这个参数完全去掉也是一样的


## ttml
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&tfmt=ttml&xorb=2&xobt=3&xovt=3

没区别

# vtt (fmt=vtt)
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=vtt&xorb=2&xobt=3&xovt=3

vtt 的 timestamp 有些奇怪，有内容重复的句子


## 思路：
* "完整字幕"比较简单，时间轴可以对上。先做完整字幕。实现中外双语
* "自动字幕"格式有些问题，英文的和中文的时间轴对不上。
	* 以中文的句子时间轴为准
	* 英文只有词的时间轴，把词填入中文句子




https://www.youtube.com/api/timedtext?fmt=vtt&v=tnsB6YCHVXA&lang=en&name=English



## ttml
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=ttml&xorb=2&xobt=3&xovt=3

## 自动字幕真的没办法找到，和翻译后 match 的时间戳，