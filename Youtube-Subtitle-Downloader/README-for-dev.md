## Changelog

v1~v15: I forgot, and I am too lazy to check git log

v16: add support for auto subtitle

v17: fix few minor issue in v16, to make sure all user get update, bump up 1 version

v18: fix https://greasyfork.org/zh-CN/forum/discussion/38299/x?locale=zh-CN  video too long issue
(for example 1:36:33) and cause subtitle error
reason is the 'downloadFile' function
using a <a> element 'href' attribute to download .srt file.
and this 'href' can't handle string that's too long

v19: fix HTML html entity problem, for example: apostrophe as &#39;

v20: 2018-June-13 seem like Youtube change their URL format, now URL must have something like '&name=en'
	v20 test with: https://www.youtube.com/watch?v=tqGkOvrKGfY  https://www.youtube.com/watch?time_continue=5&v=36tggrpRoTI

v21&v22: improve code logic
tested in Chrome 87.0.4280.67(macOS Big Sur)

v23: change 'callback' to 'await', 回调方式太难理解了，很烦，改成了 await, 代码好理解多了
