const { Telegraf } = require('telegraf');
const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs-extra');
const path = require('path');
const FormData = require('form-data');

// Bot token from environment variable
const BOT_TOKEN = process.env.BOT_TOKEN;
const bot = new Telegraf(BOT_TOKEN);

// Ensure temp directory exists
const tempDir = path.join(process.cwd(), 'temp');
fs.ensureDirSync(tempDir);

// Start command
bot.start((ctx) => {
  ctx.reply(
    '🎵 Welcome to Video to Audio Converter Bot! 🎵\n\n' +
    'Send me any video file and I will convert it to audio for you!\n\n' +
    'Supported formats: MP4, AVI, MOV, MKV, and more!'
  );
});

// Help command
bot.help((ctx) => {
  ctx.reply(
    'How to use this bot:\n\n' +
    '1. Send any video file (up to 20MB)\n' +
    '2. Wait for processing\n' +
    '3. Download your audio file!\n\n' +
    'The bot will automatically convert your video to MP3 audio format.'
  );
});

// Handle video messages
bot.on('video', async (ctx) => {
  try {
    const message = ctx.message;
    const fileId = message.video.file_id;
    
    // Send processing message
    const processingMsg = await ctx.reply('🔄 Processing your video... Please wait.');
    
    // Get file info
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Generate unique filenames
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `output_${timestamp}.mp3`);
    
    // Download video file
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(inputPath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Convert video to audio
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });
    
    // Check if output file exists and has content
    const stats = await fs.stat(outputPath);
    if (stats.size === 0) {
      throw new Error('Conversion failed - empty output file');
    }
    
    // Send audio file
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '✅ Conversion complete! Sending audio...'
    );
    
    await ctx.replyWithAudio(
      { source: outputPath },
      {
        title: 'Converted Audio',
        performer: 'Video to Audio Bot'
      }
    );
    
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    
    // Clean up temporary files
    await fs.remove(inputPath);
    await fs.remove(outputPath);
    
  } catch (error) {
    console.error('Error processing video:', error);
    await ctx.reply('❌ Sorry, there was an error processing your video. Please try again with a different video file.');
    
    // Clean up any temporary files
    try {
      const files = await fs.readdir(tempDir);
      for (const file of files) {
        if (file.includes('input_') || file.includes('output_')) {
          await fs.remove(path.join(tempDir, file));
        }
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
  }
});

// Handle document messages (for video files sent as documents)
bot.on('document', async (ctx) => {
  try {
    const message = ctx.message;
    const document = message.document;
    
    // Check if it's a video file
    const mimeType = document.mime_type;
    if (!mimeType || !mimeType.startsWith('video/')) {
      return ctx.reply('❌ Please send a video file for conversion.');
    }
    
    // Check file size (Telegram bot API limit is 20MB for videos)
    if (document.file_size > 20 * 1024 * 1024) {
      return ctx.reply('❌ File size too large. Please send a video smaller than 20MB.');
    }
    
    const processingMsg = await ctx.reply('🔄 Processing your video... Please wait.');
    const fileId = document.file_id;
    
    // Get file info
    const file = await ctx.telegram.getFile(fileId);
    const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
    
    // Generate unique filenames
    const timestamp = Date.now();
    const inputPath = path.join(tempDir, `input_${timestamp}.mp4`);
    const outputPath = path.join(tempDir, `output_${timestamp}.mp3`);
    
    // Download video file
    const response = await axios({
      method: 'GET',
      url: fileUrl,
      responseType: 'stream'
    });
    
    const writer = fs.createWriteStream(inputPath);
    response.data.pipe(writer);
    
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    
    // Convert video to audio
    await new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .toFormat('mp3')
        .audioCodec('libmp3lame')
        .audioBitrate(128)
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });
    
    // Send audio file
    await ctx.telegram.editMessageText(
      ctx.chat.id,
      processingMsg.message_id,
      null,
      '✅ Conversion complete! Sending audio...'
    );
    
    await ctx.replyWithAudio(
      { source: outputPath },
      {
        title: 'Converted Audio',
        performer: 'Video to Audio Bot'
      }
    );
    
    await ctx.telegram.deleteMessage(ctx.chat.id, processingMsg.message_id);
    
    // Clean up temporary files
    await fs.remove(inputPath);
    await fs.remove(outputPath);
    
  } catch (error) {
    console.error('Error processing document:', error);
    await ctx.reply('❌ Sorry, there was an error processing your video. Please try again with a different video file.');
  }
});

// Handle text messages
bot.on('text', (ctx) => {
  ctx.reply(
    '📹 Send me a video file and I will convert it to audio for you!\n\n' +
    'You can send videos as video messages or as document files.'
  );
});

// Error handling
bot.catch((err, ctx) => {
  console.error(`Error for ${ctx.updateType}:`, err);
  ctx.reply('❌ An error occurred while processing your request.');
});

// Export the bot for Vercel
module.exports = bot;
