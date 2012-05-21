# Daisy Central WebApp

## Introduction

This is the webapp that runs at http://live.daisyworks.com

## Tech Stack

* [node.js](http://nodejs.org)
* [socketstream](https://github.com/socketstream/socketstream)
* [socket.io](http://socket.io/)
* [connect](https://github.com/senchalabs/connect)
* [express](http://expressjs.com/)
* [redis](http://redis.io)
* [MongoDB](http://www.mongodb.org/)
* [jade](http://jade-lang.com/)
* [nib](https://github.com/visionmedia/nib)
* [stylus](http://learnboost.github.com/stylus/)
* [Twitter Bootstrap](http://twitter.github.com/bootstrap/)

## Dev Setup

*pro-tips* 

* Install [sublime text 2](http://www.sublimetext.com/2)
* Install [chrome](http://www.liberiangeek.net/2011/12/install-google-chrome-using-apt-get-in-ubuntu-11-10-oneiric-ocelot/)

### Ubuntu

#### Install Node 

##### Use Package Manager
If you don't want to bother building it, you can get it [through aptitude](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager)

##### Build From Latest Source
`HEAD 0.7.x` is unstable so you cannot use it yet.  [Check node.js release page](https://github.com/joyent/node/tags) to 
find out what the latest stable release is.  Checkout that version.  

For example, if the latest stable is `v0.6.14-release` then do this:
```sh
sudo apt-get install -y make git git-core g++ curl libssl-dev apache2-utils python
git clone https://github.com/joyent/node.git && cd node
git checkout v0.6.14-release
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
locally then you want to install it without the `-g` option.  
* If a package is a command line program that you want to run, then install command line binaries globally with `-g`.

```sh
curl http://npmjs.org/install.sh | sh
```

#### Install Debug Tools
##### Install [nodemon](https://github.com/remy/nodemon) 
Allows you to run node as a daemon that reloads if client or server files change

```sh
npm install nodemon -g
```

##### Install [ss-console](https://github.com/socketstream/ss-console) 
Adds REPL support in Chrome devtools console; can call server-side rpc from browser console

```sh
npm install ss-console -g
```

##### Install [node-inspector](https://github.com/dannycoates/node-inspector) 
Allows you to breakpoint and debug client and server-side code in Chrome devtools

```sh
npm install node-inspector -g
```

#### Install SocketStream
```sh
git clone https://github.com/socketstream/socketstream.git
cd socketstream && sudo npm link
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

### Grab The Source 
```sh 
git clone git@github.com:davisford/daisycentral.git
cd daisycentral && nodemon app.js
```

Now open browser to http://localhost:3000

### Rebuilding Twitter Bootstrap
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

Files are under `docs/assets/` -- copied them directly over to the correct foldlers in `daisycentral`

### Debugging with Breakpoints

Start up node-inspector
```sh
root@kafka:/home/davis/git/daisycentral# node-inspector &
```

Now run the app with debug flag
```sh
nodemon --debug app.js
```

Now, open browser to http://0.0.0.0:8080/debug?port=5858 in *Chrome*

Port 9000 receives Daisy WiFly HTTP data.

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
I explicitly only allow this by manipulating the database directly to avoid security holes.

Example for my email:
```javascript
db.users.update({email:"davisford@gmail.com"}, {$set: {roles: ["admin"]}})
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


