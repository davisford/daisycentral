module.exports = (function () {

  /**
   * Parse EEML http://eeml.org JSON into an object
   * @param json {String} json representation of eeml document
   * @return js object representation
   * @trows Error if required feels aren't there
   */
  function _fromJSON(json) {
    if (!json) { return { }; }

    // why not just return JSON.parse(json)? 
    // b/c we want to maintain the structure, whether the data
    // is there or not; makes it more consistent and easy to deal with

    var e = JSON.parse(json),
      obj = {
        "max_value": e.max_value,
        "current_value": e.current_value,
        "datapoints": [],
        "min_value": e.min_value,
        "id": e.id,
        "tags": e.tags || [],
        "version": e.version,
        "unit": { },
        "at": e.at
      };

    if (!e.id || e.id === '') {
      throw new Error('eeml sample requires "id"');
    } else if (!e.datapoints || e.datapoints.length === 0) {
      throw new Error('eeml requires datapoints');
    }

    e.datapoints.forEach(function (i, idx, arr) {
      obj.datapoints.push({
        "value": i.value,
        "at": i.at
      });
    });

    return obj;
  } // end _fromJSON()

  return {
    fromJSON: _fromJSON
  };

}());