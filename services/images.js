'use strict';

const puppeteer = require('puppeteer');
const Storage = require('@google-cloud/storage');
const CLOUD_BUCKET = 'enquetia';

const storage = Storage();
const bucket = storage.bucket(CLOUD_BUCKET);

async function getBrowserPage(){
  try {
    const browser = await puppeteer.launch({args: ['--no-sandbox']});
    return browser.newPage();
  } catch (e) {
    throw new Error('Failed to get browser page.');
  }
}

async function createTwitterCard(id){
  try {
    const question_id = id;
    const page = await getBrowserPage();
    await page.setViewport({width: 1200, height: 800});
    await page.goto('https://enquetia.net/' + question_id, {waitUntil: "domcontentloaded"});
  
    const rect = await page.evaluate(() => {
      const rect = document.getElementsByClassName("enquete")[0].getBoundingClientRect();
      return {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
    });
    
    const img = await page.screenshot({
      clip: rect,
    });
    await page.close();
  
    const gcsname = question_id + '.png';
    const file = bucket.file(gcsname);
    
    const stream = file.createWriteStream({
      metadata: {
        contentType: 'image/png',
      },
      resumable: false,
    });
  
    stream.on('error', err => {
      console.log(err);
      return res.status(500).send('Create twitter card failed.');
    });
  
    stream.on('finish', () => {
      console.log("finish")
      file.makePublic().then(() => {
        return res.status(200).send('Create twitter card success.');
      });
    });
    return await stream.end(img);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  createTwitterCard: createTwitterCard,
};
