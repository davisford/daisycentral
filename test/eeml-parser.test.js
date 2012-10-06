
var should = require('should'),
  fs = require('fs'),
  path = require('path'),
  parser = require('../server/app/eeml-parser');

describe('EEML parser tests', function () {

  var testObjs;

  before(function (done) {
    // running make pwd is in root dir of project
    //console.log(path.resolve('.'));
    fs.readFile('./test/eeml.json', 'utf-8', function (error, contents) {
      if (error) {
        done(error);
      } else {
        testObjs = JSON.parse(contents);
        done();
      }
    });
  });

  it('should parse eeml json ok', function (done) {
    
    var obj = parser.fromJSON(JSON.stringify(testObjs[1]));
    obj.should.have.property('max_value');
    obj.max_value.should.eql('999.0');
    obj.should.have.property('current_value');
    obj.current_value.should.eql('23');
    obj.datapoints.length.should.eql(3);
    done();
  });

});