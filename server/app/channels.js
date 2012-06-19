// in ./server/app/channels.js

// list of pub/sub channels and events
module.exports = {
  
  admin: {
    channel: 'admin',
    daisy: {
      status: 'daisy:status',
      registered: 'daisy:registered'
    }
  },

  user: {
    daisy: {
      status: 'daisy:status',
      registered: 'daisy:registered'
    }
  }
}