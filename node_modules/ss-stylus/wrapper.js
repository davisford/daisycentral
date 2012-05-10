// Stylus 'CSS' wrapper for SocketStream 0.3

var fs = require('fs')
  , stylus = require('stylus')
  , nib = require('nib');

exports.init = function(root, config) {

  return {

    name: 'Stylus',

    extensions: ['styl', 'stylus'],

    assetType: 'css',

    contentType: 'text/css',

    compile: function(path, options, cb) {
      
      // Get dir from path to enable @include commmand
      var dir = path.split('/'); dir.pop();

      var input = fs.readFileSync(path, 'utf8');

      var compress = options && options.compress;

      stylus(input, {filename: path, paths: [dir.join('/')], compress: compress})
        .use(nib())
        .render(function(err, css) {
        if (err) {
          var message = '! - Unable to compile Stylus file %s into CSS';
          console.log(String.prototype.hasOwnProperty('red') && message.red || message, path);
          console.log(err);
        }
        cb(css);
      });
    }
  }
}