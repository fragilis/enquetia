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
  font: 'bold 67px "Kosugi Maru"',
  lineHeight: 72,
  color: "#333333"
};

const bodyFontStyle = {
  font: '30px "Kosugi Maru"',
  lineHeight: 38,
  color: "#666666"
};

const itemFontStyle = {
  font: 'bold 30px "Kosugi Maru"',
  lineHeight: 38,
  color: "#333333"
};

const logoFontStyle = {
  font: '35px "Kosugi Maru"',
  lineHeight: 38,
  color: "#03414D"
};

const width = 1200;
const margin = 40;
const padding = 60;
const minHeight = 630;
const lineWidth = width - margin*4;
const backgroundColor = "#A0F6D2";

function setupCanvas(question, answers){
  let canvas = createCanvas(width, minHeight);
  const ctx = canvas.getContext('2d');

  ctx.font = titleFontStyle.font;
  const titleLines = splitByMeasureWidth(question.title, lineWidth, ctx);
  const title = {
    lines: titleLines,
    height: titleLines.length * titleFontStyle.lineHeight
  };

  ctx.font = bodyFontStyle.font;
  const bodyLines = splitByMeasureWidth(question.description, lineWidth, ctx);
  const body = {
    lines: bodyLines,
    height: bodyLines.length * bodyFontStyle.lineHeight
  };

  ctx.font = itemFontStyle.font;
  const items = [];
  const prefix = question.answer_type === "radio" ? "〇 " : question.answer_type === "checkbox" ? "□ " : "";
  answers.forEach(answer => {
    const itemLines = splitByMeasureWidth(prefix + answer.content, lineWidth/2-margin, ctx);
    const item = {
      lines: itemLines,
      height: itemLines.length * itemFontStyle.lineHeight
    };
    items.push(item);
  });

  let itemsHeight = 0;
  for(let i=0; i<Math.ceil(items.length/2); i++){
    const left = items[i*2];
    let height = left.height;
    if(i*2+1 < items.length) {
      const right = items[i*2+1];
      height =  Math.max(left.height, right.height);
      left.height = height;
      right.height = height;
    }
    itemsHeight += height;
  }

  const contentHeight = title.height + margin*2 + body.height + itemsHeight + padding*4;
  if(minHeight < contentHeight){
    canvas = createCanvas(width, contentHeight);
  }

  return [canvas, title, body, items];
}

function splitByMeasureWidth(str, maxWidth, ctx) {
  const chars = Array.from(str);
  const lines = [];
  let line = '';

  chars.forEach((c, i) => {
    if (ctx.measureText(line + chars[i]).width > maxWidth){
      lines.push(line);
      line = chars[i];
    } else {
      line += chars[i];
    }
  });
  lines.push(line);

  return lines;
};

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x, y + radius);
  ctx.lineTo(x, y + height - radius);
  ctx.arcTo(x, y + height, x + radius, y + height, radius);
  ctx.lineTo(x + width - radius, y + height);
  ctx.arcTo(x + width, y + height, x + width, y + height - radius, radius);
  ctx.lineTo(x + width, y + radius);
  ctx.arcTo(x + width, y, x + width - radius, y, radius);
  ctx.lineTo(x + radius, y);
  ctx.arcTo(x, y, x, y + radius, radius);
  ctx.fill();
}

function createTwitterCard(question, answers, cb){
  try{
    const [canvas, title, body, items] = setupCanvas(question, answers);
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#FFFFFF";
    roundedRect(ctx, margin, margin, canvas.width-margin*2, canvas.height-margin*2, margin/2);

    ctx.textBaseline = 'top';
    const fillLines = (ctx, fontStyle, lines, left, top) => {
      ctx.fillStyle = fontStyle.color;
      ctx.font = fontStyle.font;
      lines.forEach((line, i) => {
        ctx.fillText(line, left, top + fontStyle.lineHeight*i);
      });
    };
    ctx.textAlign = "center";
    fillLines(ctx, titleFontStyle, title.lines, canvas.width/2, padding + margin);
    ctx.textAlign = "start";
    fillLines(ctx, bodyFontStyle, body.lines, margin*2, margin + title.height + padding*2);
    ctx.textAlign = "center";
    let itemHeight = 0;
    items.forEach((item, i) => {
      fillLines(ctx, itemFontStyle, item.lines, margin + lineWidth/4*((i%2)*2+1), margin + title.height + body.height + itemHeight + padding*3);
      if(i%2 || i+1 === items.length) itemHeight += item.height;
    });
    ctx.textAlign = "right";
    ctx.textBaseline = 'bottom';
    fillLines(ctx, logoFontStyle, ["enquetia.net"], canvas.width-5, canvas.height-5);

    const b64 = canvas.toDataURL().split(',');
    const img = base64.decode(b64[1]);

    const gcsname = question.id + '.png';
    const file = bucket.file(gcsname);

    const stream = file.createWriteStream({
      metadata: {
        contentType: 'image/png',
      },
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
