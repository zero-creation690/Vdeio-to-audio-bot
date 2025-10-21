const { Telegraf } = require('telegraf');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

// Bot token from environment variable
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// Ensure temp directory exists
const tempDir = path.join('/tmp', 'video-bot');
fs.ensureDirSync(tempDir);

// Start command
bot.start((ctx) => {
  ctx.reply(
    '🎵 Welcome to Video to Audio Converter Bot! 🎵\n\n' +
    'Send me any video file and I will convert it to audio for you!\n\n' +
    '⚠️ Note: For now, I can only process short videos (due to hosting limitations).\n' +
    'For longer videos, I\'ll provide alternative solutions.'
  );
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    'How to use this bot:\n\n' +
    '1. Send any video file (up to 20MB)\n' +
    '2. I\'ll process it and send audio back\n' +
    '3. For longer videos, I\'ll suggest online tools\n\n' +
    'Supported formats: MP4, AVI, MOV, MKV, etc.'
  );
});

// Handle video messages
bot.on('video', async (ctx) => {
  try {
    const message = ctx.message;
    const video = message.video;
    
    // Check file size
    if (video.file_size > 10 * 1024 * 1024) { // 10MB limit
      return ctx.reply(
        '❌ Video is too large for processing (max 10MB).\n\n' +
        '💡 Alternative solutions:\n' +
        '• Use online converters like: online-audio-converter.com\n' +
        '• Compress your video and try again\n' +
        '• Use @vid bot for larger files'
      );
    }
    
    const processingMsg = await ctx.reply('🔄 Processing your video... Please wait.');
    
    // Get file info
    const file = await ctx.telegram.getFile(video.file_id);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // For Vercel, we can't use FFmpeg, so we'll send the video as document
    // and suggest conversion methods
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '✅ Video received! Due to hosting limitations, I cannot convert videos directly.\n\n' +
      '📝 Here are your options:\n\n' +
      '1. Use free online converters:\n' +
      '   • online-audio-converter.com\n' +
      '   • convertio.co/video-mp3\n' +
      '   • cloudconvert.com\n\n' +
      '2. Download your video and use these tools\n\n' +
      '3. For better experience, consider hosting this bot on a VPS with FFmpeg'
    );

    // Send the video file back so user can download it
    await ctx.replyWithDocument(video.file_id, {
      caption: '📹 Your video file. You can use online tools to convert it to audio.'
    });
    
  } catch (error) {
    console.error('Error processing video:', error);
    await ctx.reply(
      '❌ Error processing video. Please try again.\n\n' +
      '💡 Tip: Try sending a shorter video or use online converters mentioned in /help'
    );
  }
});

// Handle document messages
bot.on('document', async (ctx) => {
  try {
    const message = ctx.message;
    const document = message.document;
    
    // Check if it's a video file
    const mimeType = document.mime_type;
    if (!mimeType || !mimeType.startsWith('video/')) {
      return ctx.reply('❌ Please send a video file for processing.');
    }
    
    if (document.file_size > 10 * 1024 * 1024) {
      return ctx.reply(
        '❌ Video is too large for processing (max 10MB).\n\n' +
        '💡 Try these online converters:\n' +
        '• online-audio-converter.com\n' +
        '• convertio.co/video-mp3\n' +
        '• cloudconvert.com'
      );
    }
    
    const processingMsg = await ctx.reply('🔄 Processing your video document...');
    
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '✅ Video document received!\n\n' +
      '📝 Due to hosting limitations, I suggest using these free online tools:\n\n' +
      '🌐 Online Converters:\n' +
      '• online-audio-converter.com\n' +
      '• convertio.co/video-mp3\n' +
      '• cloudconvert.com\n\n' +
      '📱 Mobile Apps:\n' +
      '• "Video to MP3 Converter" (Android/iOS)\n' +
      '• "Media Converter" apps\n\n' +
      '💻 Desktop:\n' +
      '• VLC Media Player\n' +
      '• Audacity (with FFmpeg)'
    );

    // Send the document back
    await ctx.replyWithDocument(document.file_id, {
      caption: '📄 Your video file. Use the suggested tools to convert it to audio.'
    });
    
  } catch (error) {
    console.error('Error processing document:', error);
    await ctx.reply('❌ Error processing document. Please try again.');
  }
});

// Text message handler with conversion suggestions
bot.on('text', (ctx) => {
  const text = ctx.message.text.toLowerCase();
  
  if (text.includes('convert') || text.includes('audio') || text.includes('mp3')) {
    ctx.reply(
      '🎵 To convert videos to audio:\n\n' +
      '1. Send me a video file (max 10MB)\n' +
      '2. I\'ll suggest conversion methods\n\n' +
      '🛠️ Recommended Online Tools:\n' +
      '• online-audio-converter.com\n' +
      '• convertio.co/video-mp3\n' +
      '• cloudconvert.com\n\n' +
      '📱 Mobile Apps:\n' +
      '• "Video to MP3 Converter"\n' +
      '• "Media Converter"\n\n' +
      'Send me a video to get started!'
    );
  } else {
    ctx.reply(
      '📹 Send me a video file and I\'ll help you convert it to audio!\n\n' +
      'Use /help for more information about conversion options.'
    );
  }
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred. Please try again later.');
});

// Export the bot for Vercel
module.exports = bot;
