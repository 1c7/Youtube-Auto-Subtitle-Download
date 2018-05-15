// Get auto subtitle URL.


// Usage:
  // Open a Youtube Video
  // Run following code in Console.

// Tested, it work at Jan 26, 2017
yt.config.get("TTS_URL") + "&kind=asr&lang=en&fmt=srv3"

// If above one not wokring, this should work
yt.getConfig("TTS_URL") + "&kind=asr&lang=en&fmt=srv3"

// note: fmt= srv1, srv2, srv3
// three value is allow
