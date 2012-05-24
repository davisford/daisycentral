# Stylus (CSS) wrapper for SocketStream 0.3

Allows you to use [Stylus](http://learnboost.github.com/stylus) files (.styl) in your SocketStream project.


### Instructions

Add `ss-stylus` to your application's `package.json` file and then add this line to app.js:

    ss.client.formatters.add(require('ss-stylus'));

[Nib](http://visionmedia.github.com/nib) is included by default. To use this in your app add:

    @import 'nib'

at the top of your .styl file.

