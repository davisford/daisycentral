// in server/models/plugins/lastmodified.js

/* 
 * Mongoose plugin that adds a last modified timestamp to any model;
 * Add it to your schema like MySchema.plugin(require('./models/plugins/lastmodified'))
 * ..and it will update the timestamp on any update/save
 */
module.exports = exports = function lastModifiedPlugin (schema, options) {
  schema.add({ lastMod: Date });

  schema.pre('save', function (next) {
    this.lastMod = new Date();
    next();
  });

  if (options && options.index) {
    schema.path('lastMod').index(options.index);
  }
}