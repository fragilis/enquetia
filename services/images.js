'use strict';

const Storage = require('@google-cloud/storage');
const config = require('../config')
const CLOUD_BUCKET = config.get('CLOUD_BUCKET');

const storage = Storage();
const bucket = storage.bucket(CLOUD_BUCKET);

const { registerFont, createCanvas } = require('canvas');
const base64 = require('urlsafe-base64');
registerFont('public/fonts/KosugiMaru-Regular.ttf', {family: 'Kosugi Maru'});

const titleFontStyle = {
  //font: 'bold 73px "Noto Sans CJK JP"',
  font: 'bold 73px "Kosugi Maru"',
  lineHeight: 80,
  color: '#333333'
};

const bodyFontStyle = {
  //font: '30px "Noto Sans CJK JP"',
  font: '30px "Kosugi Maru"',
  lineHeight: 38,
  color: '#666666'
};

const width = 1200;
const minHeight = 630;
const padding = 80;
const lineWidth = width - padding*2;
const titleMargin = 40;
const backgroundColor = '#d3ffb1';

function setupCanvas(question){
  let canvas = createCanvas(width, minHeight);
  const context = canvas.getContext('2d');

  context.font = titleFontStyle.font;
  const titleLines = splitByMeasureWidth(question.title, lineWidth, context);
  const title = {
    lines: titleLines,
    height: titleLines.length * titleFontStyle.lineHeight
  };

  context.font = bodyFontStyle.font;
  const bodyLines = splitByMeasureWidth(question.description, lineWidth, context);
  const body = {
    lines: bodyLines,
    height: bodyLines.length * bodyFontStyle.lineHeight
  };

  const contentHeight = title.height + titleMargin + body.height + padding*2;
  if(minHeight < contentHeight){
    canvas = createCanvas(width, contentHeight);
  }

  return [canvas, title, body];
}

function splitByMeasureWidth(str, maxWidth, context) {
  const chars = Array.from(str);
  const lines = [];
  let line = '';

  chars.forEach((c, i) => {
    if (context.measureText(line + chars[i]).width > maxWidth){
      lines.push(line);
      line = chars[i];
    } else {
      line += chars[i];
    }
  });
  lines.push(line);

  return lines;
};

function createTwitterCard(question, cb){
  try{
    const [canvas, title, body] = setupCanvas(question);
    const context = canvas.getContext('2d');

    context.fillStyle = backgroundColor;
    context.fillRect = (0, 0, canvas.width, canvas.height);
    context.textBaseline = 'top';

    const fillLines = (context, fontStyle, lines, left, top) => {
      context.fillStyle = fontStyle.color;
      context.font = fontStyle.font;
      lines.forEach((line, i) => {
        context.fillText(line, left, top + fontStyle.lineHeight*i);
      });
    };
    fillLines(context, titleFontStyle, title.lines, padding, padding);
    fillLines(context, bodyFontStyle, body.lines, padding, padding + title.height + titleMargin);

    const b64 = canvas.toDataURL().split(',');
    const img = base64.decode(b64[1]);

    const gcsname = question.id + '.png';
    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
      resumable: false,
    });

    stream.on('error', err => {
      console.log(err);
      return cb(err, null);
    });

    stream.on('finish', () => {
      file.makePublic().then(() => {
        return cb(null, `https://storage.googleapis.com/${config.get("CLOUD_BUCKET")}/${gcsname}`);
      });
    });

    stream.end(img);
  } catch (e) {
    console.log(e)
    return cb(e, null);
  }
}

module.exports = {
  createTwitterCard: createTwitterCard,
};
