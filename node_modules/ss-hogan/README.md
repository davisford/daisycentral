# Hogan Template Engine wrapper for SocketStream 0.3

http://twitter.github.com/hogan.js/

Use pre-compiled Hogan (Mustache-compatible) client-side templates in your app to benefit from increased performance and a smaller client-side library download.


### Installation

The `ss-hogan` module is installed by default with new apps created by SocketStream 0.3. If you don't already have it installed, add `ss-hogan` to your application's `package.json` file and then add this line to app.js:

```javascript
ss.client.templateEngine.use(require('ss-hogan'));
```

Restart the server. From now on all templates will be pre-compiled and accessibale via the `ss.tmpl` object.

Note: Hogan uses a small [client-side VM](https://raw.github.com/twitter/hogan.js/master/lib/template.js) which renders the pre-compiled templates. This file is included and automatically sent to the client.


### Usage

E.g. a template placed in

    /client/templates/offers/latest.html

Can be rendered in your browser with

```javascript
// assumes var ss = require('socketstream')
var html = ss.tmpl['offers-latest'].render({name: 'Special Offers'})
```


### Options

When experimenting with Hogan, or converting an app from one template type to another, you may find it advantageous to use multiple template engines and confine use of Hogan to a sub-directory of `/client/templates`.

Directory names can be passed to the second argument as so:

```javascript
ss.client.templateEngine.use(require('ss-hogan'), '/hogan-templates');
```