// server/rpc/products.js
exports.actions = function(req, res, ss){

  return {

    latest: function(){
      res(['iPhone 4S', 'Dell LCD TV', 'HP Printer']);
    }

  }
}