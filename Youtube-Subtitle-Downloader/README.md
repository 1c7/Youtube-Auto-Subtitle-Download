## 双语字幕原理说明
中文 \n 英语   



## 自动字幕

### 英文
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3

### 中文
https://www.youtube.com/api/timedtext?v=n1zpnN-6pZQ&asr_langs=de%2Cen%2Ces%2Cfr%2Cit%2Cja%2Cko%2Cnl%2Cpt%2Cru&caps=asr&xorp=true&xoaf=5&hl=zh-CN&ip=0.0.0.0&ipbits=0&expire=1602073051&sparams=ip%2Cipbits%2Cexpire%2Cv%2Casr_langs%2Ccaps%2Cxorp%2Cxoaf&signature=3BA095651949DD59FA8095E70EA0F1015BA184D0.7BCEEA5A4DAC185D72735C54DE2BF1AC20091343&key=yt8&kind=asr&lang=en&fmt=json3&xorb=2&xobt=3&xovt=3&tlang=zh-Hans

英文的是一个个的词 (json 格式)
中文的是一句句话 (json 格式)
不同的。

问题：这个 url 去哪里找？

var raw_string = ytplayer.config.args.player_response;
json = JSON.parse(raw_string);

加上 fmt=json3 就行了。
fmt=vtt 也可以，但是内容有问题

