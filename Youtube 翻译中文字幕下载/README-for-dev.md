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
- 2020-12-3 升级为 v8
  - 抽象
  - fix 逻辑, try catch 里面有可能 for loop 完了应该 return 一个默认值
- 2020-12-3 升级为 v9
  - 改进逻辑，删了些东西
