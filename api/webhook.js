const bot = require('./bot');

module.exports = async (req, res) => {
  try {
    if (req.method === 'POST') {
      await bot.handleUpdate(req.body, res);
    } else {
      res.status(200).json({ 
        status: 'OK', 
        message: 'Telegram Video to Audio Bot is running!' 
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
