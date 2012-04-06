# Daisy Central WebApp

## Introduction

This the webapp that runs at http://live.daisyworks.com

## Tech Stack

* [node.js] (http://nodejs.org)
* [socketstream] (https://github.com/socketstream/socketstream)
* [socket.io] (http://socket.io/)
* [connect] (https://github.com/senchalabs/connect)
* [express] (http://expressjs.com/)
* [redis] (http://redis.io)
* [MongoDB] (http://www.mongodb.org/)
* [jade] (http://jade-lang.com/)
* [nib] (https://github.com/visionmedia/nib)
* [stylus] (http://learnboost.github.com/stylus/)
* [Twitter Bootstrap] (http://twitter.github.com/bootstrap/)

## Dev Setup

*pro-tips* 

* Install [sublime text 2](http://www.sublimetext.com/2)
* Install [chrome](http://www.liberiangeek.net/2011/12/install-google-chrome-using-apt-get-in-ubuntu-11-10-oneiric-ocelot/)

### Ubuntu

#### Install Node
HEAD 0.7.x is unstable so you cannot use it yet.  Use git to checkout v0.6.14-release

```
sudo apt-get install -y make git git-core g++ curl libssl-dev apache2-utils python
git clone https://github.com/joyent/node.git && cd node
git checkout v0.6.14-release
./configure && make && make install
```

Test it:

```
node console.log('hello, world'); 
hello, world
```

#### Install NPM
```
curl http://npmjs.org/install.sh | sh
```

#### Install Debug Tools
##### Install [nodemon](https://github.com/remy/nodemon) -- allows you to run node as a daemon that reloads if client or server files change

```npm install nodemon -g```

##### [ss-console](https://github.com/socketstream/ss-console) -- adds REPL support in Chrome devtools console; can call server-side rpc from browser console

```npm install ss-console -g```

##### [node-inspector](https://github.com/dannycoates/node-inspector) -- allows you to breakpoint and debug client and server-side code in Chrome devtools

```npm install node-inspector -g```

#### Install SocketStream
```
git clone https://github.com/socketstream/socketstream.git
cd socketstream && sudo npm link
```

#### Install Redis
```
sudo apt-get install redis-server
```

#### Install Mongo-DB
TODO

### Grab The Source 
``` 
git@github.com:davisford/daisycentral.git
cd daisycentral && nodemon app.js
```

Now open browser to http://localhost:3000

### Rebuilding Twitter Bootstrap
You need less and uglify-js to build:
```
npm install less uglify-js -g
```

*Warning* I tried installing uglify-js before socketstream and it broke it.  Make sure you install uglify-js after socketstream.

```
git clone https://github.com/twitter/bootstrap/
cd bootstram && make
```

Files are under docs/assets/ -- copied them directly over to daisycentral

### Debugging with Breakpoints

Start up node-inspector
```
root@kafka:/home/davis/git/daisycentral# node-inspector &
[1] 27065
root@kafka:/home/davis/git/daisycentral#    info  - socket.io started
visit http://0.0.0.0:8080/debug?port=5858 to start debugging
```

Now run the app with debug flag
```
nodemon --debug app.js
```

Now, open browser to http://0.0.0.0:8080/debug?port=5858 in *Chrome*


