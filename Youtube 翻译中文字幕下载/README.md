## Youtube 翻译中文字幕下载

Youtube 播放器右下角有个 Auto-tranlsate，可以把视频字幕翻成中文。这个脚本是下载这个中文字幕

## 安装地址: 用于 Tampermonkey

[Greasy Fork: Youtube 翻译中文字幕下载](https://greasyfork.org/zh-CN/scripts/38941-youtube-%E7%BF%BB%E8%AF%91%E4%B8%AD%E6%96%87%E5%AD%97%E5%B9%95%E4%B8%8B%E8%BD%BD-v2)

## 说明

原代码库在：  
https://github.com/1c7/Youtube-translate-chinese-subtitle-download  
懒得改了，这次代码挪到这边来

### 版本历史

- 2020-12-2 发现 v2 的脚本失效了,下载下来的是一个空字幕
- 2020-12-2 升级为 v3
  - 修复了下载失败问题
  - v3 支持了"自动字幕"翻译的中文下载(之前是不支持的)
- 2020-12-2 升级为 v4
  - v4 仅为小调整
  - 菜单项的文案进行了修改
  - 去掉了代码里一些 console.log 以及进行了整理
- 2020-12-3 升级为 v5
  - `ytplayer.config.args.player_response;` 的部分做了改进
- 2020-12-3 升级为 v6
  - `ytplayer.config.args.player_response;` 的部分做了抽象
  - 把代码用 `(function(){})()` 包起来了

## TODO

```javascript
if (ytplayer.config.args.player_response) {
  var raw_string = ytplayer.config.args.player_response;
  json = JSON.parse(raw_string);
}
if (ytplayer.config.args.raw_player_response) {
  json = ytplayer.config.args.raw_player_response;
}
```

这个部分可以抽象出来变成一个函数
