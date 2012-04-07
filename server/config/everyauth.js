var everyauth = require('everyauth');

module.exports.init = function(ss) {
  ss.http.middleware.append(everyauth.middleware());
};

everyauth.twitter
  .consumerKey('nQ5UWsQvj9V2Y7eCHYbQ')
  .consumerSecret('SyB4rftvGYDP6BfTPDp0Gp63B7UBXFIbjh2Eg8ww4')
  .findOrCreateUser( function(session, accessToken, accessTokenSecret, twitterUserMetadata) {
    // todo store in redis/mongo; move out to middleware
    var userName = twitterUserMetadata.screen_name;
    console.log('Twitter username is ', userName);
    session.userId = userName;
    session.save();
    return true;
  }).redirectPath('/');