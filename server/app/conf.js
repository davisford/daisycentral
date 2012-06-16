module.exports = {
  fb: {
    appId: '407914185903096'
    , appSecret: '9875f012ac2b24d3e9e4583b9c9a5d29'
    , myHostname: 'http://local.host:3000'
  }
  , twit: {
        consumerKey: 'nQ5UWsQvj9V2Y7eCHYbQ'
      , consumerSecret: 'SyB4rftvGYDP6BfTPDp0Gp63B7UBXFIbjh2Eg8ww4'
      , myHostname: 'http://localhost:3000'
  }
  , google: {
      clientId: '897736032157.apps.googleusercontent.com'
      , clientSecret: 'pEXRmB-rLZXVkAiujEkhcJGZ'
      , myHostname: 'http://demo.daisyworks.com'
  }
  , everyauth: {
      debug: true
  }
  , webserver: {
      port: 3006 // port the webserver listens on
  }
  , deviceserver: {
      port: 9000 // port the server listens on that receives posts from devices
  }
  , db: {
      url: 'mongodb://localhost/daisycentral'
  }
};