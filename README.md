# Daisy Central WebApp

## Introduction

This is the webapp that runs at http://demo.daisyworks.com.  Early prototype code was hosted at http://live.daisyworks.com.
I'm now working on building out a full-blown app that will provide a web bridge to our hardware devices found at http://daisyworks.com

## Tech Stack

* [node.js](http://nodejs.org) - app server
* [socketstream](https://github.com/socketstream/socketstream) - main framework
* [socket.io](http://socket.io/) - client server comms via websocket (hopefully)
* [connect](https://github.com/senchalabs/connect) / [express](http://expressjs.com/) - routing, HTTP, etc.
* [redis](http://redis.io) - session state and pub/sub for distributed environ
* [MongoDB](http://www.mongodb.org/) - persistence (took long hard look at Riak)
* [mongoose](http://mongoosejs.org) - ORM on top of MongoDB
* [Backbone.js](http://documentcloud.github.com/backbone/) - client side Model-View app architecture
* [underscore](http://documentcloud.github.com/underscore/) - server/client side functional syntactic JS sugar
* [jade](http://jade-lang.com/) - server/client templating
* [stylus](http://learnboost.github.com/stylus/) / [nib](https://github.com/visionmedia/nib) - makes CSS bearable
* [Twitter Bootstrap](http://twitter.github.com/bootstrap/) - layout, widgets
* [Flot](http://code.google.com/p/flot/) - charting
* [DataTables](http://datatables.net/) - tables
* [jsPlumb](http://jsplumb.org) - pipes / connectors for drawing rules

## Dev Setup
This Dev setup is for Ubuntu.  I dev on both Mac and Ubuntu.  Mac setup is similar, but you can use 
[homebrew](http://mxcl.github.com/homebrew/) to install some of the items below instead of Aptitude.

*pro-tips* 

* Install [sublime text 2](http://www.sublimetext.com/2)
* Install [chrome](http://www.liberiangeek.net/2011/12/install-google-chrome-using-apt-get-in-ubuntu-11-10-oneiric-ocelot/)

### Ubuntu

#### Install Node 

##### Use Package Manager
If you don't want to bother building it, you can get it [through aptitude](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

##### Build From Latest Source
`HEAD 0.8.x` is the current stable release.  [Check node.js release page](https://github.com/joyent/node/tags) to 
find out what the latest stable release is.  Checkout that version.  

For example, if the latest stable is `v0.8.0` then do this:
```sh
sudo apt-get install -y make git git-core g++ curl libssl-dev apache2-utils python
git clone https://github.com/joyent/node.git && cd node
git checkout v0.8.0
./configure && make && make install
```

Test it:

```sh
node console.log('hello, world'); 
hello, world
```

#### Install NPM
NPM is the package manager for node.js.  [Read this first](http://npmjs.org/doc/folders.html) so you understand
about packages / folders, etc.  If you installed node via aptitude, then _I think_ it installs npm for you, so 
this step would be unnecessary.  Try running `npm` from the command line to see if it is there.

*pro-tips*
* If a library/package is just a dependency that this project needs, (i.e. a library that the code will `require()` 
locally then you want to install it **without** the `-g` option.  
* If a package is a command line program that you want to run, then install command line binaries globally with `-g`.

```sh
curl http://npmjs.org/install.sh | sh
```

#### Install Debug Tools
Install these tools with the global `-g` option so you can run them from the command line.

##### Install [nodemon](https://github.com/remy/nodemon) 
Allows you to run node as a daemon that reloads if client or server files change

```sh
npm install nodemon -g
```

##### Install [ss-console](https://github.com/socketstream/ss-console) 
###### OPTIONAL
Adds REPL support in Chrome devtools console; can call server-side rpc from browser console

```sh
npm install ss-console -g
```

##### Install [node-inspector](https://github.com/dannycoates/node-inspector) 
###### OPTIONAL BUT VERY USEFUL
Allows you to breakpoint and debug client and server-side code in Chrome devtools

```sh
npm install node-inspector -g
```

#### Install Redis
```sh
sudo apt-get install redis-server
```

#### Install Mongo-DB
http://www.mongodb.org/display/DOCS/Ubuntu+and+Debian+packages has the instructions for Ubuntu.  You can build from
source or install the latest stable package from the 10Gen repo.  Latter is recommended.

After you install, you need to create the data directory:

```sh
$ sudo mkdir -p /data/db
$ sudo chown `id -u` /data/db
```

Now, start mongod: 

```sh
$ mongod &
```

It should start without error.

### Grab The Source & Build & Run
Checkout the source and run `sudo npm install`.  If I've done a good job of keeping the `package.json` file up to date, 
then `npm install` will install all local dependencies for you.  If you get an error complaining about a particular
library not being found, then run `npm install "library-name"` and I'll fix the `package.json` file.

#### Clone The Repo
```sh 
git clone git@github.com:davisford/daisycentral.git
```

#### Build
```sh
cd daisycentral
sudo npm install
npm socketstream link
```

#### Run
```sh
nodemon server.js
```

Now open browser to http://localhost:3006

### Rebuilding Twitter Bootstrap
I'm just documenting the process here for building Twitter Bootstrap.  You do not need to do this.
This step is not strictly necessary unless you want to rebuild it.  I have already built bootstrap and copied the files needed into the project...however, if we want to tweak bootstrap with a theme or what-not, then this is how to rebuild:

You need less and uglify-js to build:
```sh
npm install less uglify-js -g
```

*Warning* I tried installing uglify-js before socketstream and it broke it.  Make sure you install uglify-js after socketstream.

```sh
git clone https://github.com/twitter/bootstrap/
cd bootstrap && make
```

Files are under `docs/assets/` -- copied them directly over to the correct folders in `daisycentral`

### Debugging with Breakpoints

Start up node-inspector
```sh
root@kafka:/home/davis/git/daisycentral# node-inspector &
```

Now run the app with debug flag
```sh
nodemon --debug app.js
```

Now, open browser to http://0.0.0.0:8080/debug?port=5858 in **Chrome**

Port 9000 receives Daisy WiFly HTTP data.  Port 3000 is the webapp.

### Updating package dependencies

To update locally run `sudo npm update` in the project dir.  To update globally run `sudo npm update -g`.  After update, you'll probably need to rebuild socketstream so:

```sh
cd socketstream
git pull
sudo npm update
sudo npm link
```

### Rebuild Platform Dependent Stuff
Libraries like `bcrypt` have to be compiled natively, so do it thusly: `sudp npm rebuild bcrypt`

The bcrypt binary build output should not be checked into git.  It is platform specific.

## MongoDB Admin
To start the database server, run `mongod &` or `mongod -dbpath /path/to/data`.  The default path it uses is `/data/`.  You can then start the REPL in another window via `mongo`.

The database for this app is named `daisycentral` so after you start the client by running `mongo` do: `use daisycentral`. Example:

```sh
davis@pluto:/srv/www/foobar.daisyworks.com$ mongo
MongoDB shell version: 1.2.2
url: test
connecting to: test
Sun May 20 13:18:19 connection accepted from 127.0.0.1:50232 #1
type "exit" to exit
type "help" for help
> use daisycentral          
```

### Add Admin Role To Your User Account
After you register on the webapp, you can add yourself to the admin users role so you can access the admin features.  
I explicitly only allow this by manipulating the database directly to avoid security holes.  You first need to login to 
the webapp and register with your email address.  Then go to the mongo REPL and do this (substitute your email):

Example for my email:
```javascript
> use daisycentral
> db.users.update({email:"davisford@gmail.com"}, {$set: {roles: ["admin"]}})
```

Now you have access to /admin section of the app.  To reach the admin section, first login to the main app.  After
you have logged in go to http://localhost:3000/admin

## nodemon on Ubuntu
Current version is *0.6.14* but this doesn't work on Ubuntu 11.10 https://github.com/remy/nodemon/issues/82, so drop it down:

```sh
sudo npm remove nodemon -g
sudo npm install nodemon@0.5.7 -g
```
## Increase open file limit on Ubuntu
By default the number of open files is 1024 for a user.  The live reload features scans all the files under the
subdir and it will hit this limit and the app will crash.  To fix it, you have to increase the `nofile` limit
in Ubuntu like this:

```sh
$ sudo gedit /etc/security/limits.conf
```

Now add the lines:

```sh
*   hard   nofile   65534
*   soft   nofile   65534
```

Now, uncomment the line `session required pam_limits.so` in `/etc/pam.d/su` and reboot your system.
To test it, after you reboot run `ulimit -n` and you should see 65534.

## Modified Libs

### Flot
The original maintainer got too busy, but this proved to be the best charting tool after looking at some alternatives.  There are a couple people picking up as maintainers for flot, but I forked it myself:

https://github.com/davisford/flot

I made some changes to it, so that is the version used in DaisyCentral.  Note to self: [this library](http://novus.github.com/nvd3/) looks _really_ nice.