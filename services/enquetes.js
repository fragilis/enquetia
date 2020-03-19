'use strict';

const images = require('./images');
const models = require('../models/model-datastore');

function setEnqueteValues(body, user){
  const question = {
    title: body.title,
    description: body.description,
    answer_type: body.answer_type,
    period_hours: parseInt(body.period_hours, 10),
    count: 0,
    publish_status: parseInt(body.publish_status, 10),
    published_at: new Date()
  };

  const answers = body.answers.map(answer => {
    const entity = {
      content: answer,
      count: 0
    };
    return entity;
  });

  // If the user is logged in, set them as the creator of the question.
  if (user) {
    question.user_id = parseInt(user.id);
  } else {
    question.user_id = 0;
  }
  return [question, answers];
}

function setVoteValues(body){
  const answer_ids = body.answer instanceof Array ?
    body.answer.map(a => parseInt(a, 10)) :
    [parseInt(body.answer, 10)];

  const vote = {
    question_id: parseInt(body.question_id, 10),
    answer_ids: answer_ids,
    finger_print: '',
    created_at: new Date()
  };
  return vote;
}

async function setConditions(question, cookie, profile){
  try {
    if(question.period_hours === -1) question.is_expired = false;
    else {
      const published_at = new Date(question.published_at.getTime());
      const expired_at = published_at.setHours(published_at.getHours() + question.period_hours);
      const current = Date.now();
      const is_expired = expired_at < current ? true : false;
      question.expired_at = expired_at;
      question.left_hours = (expired_at - current)/1000/60/60;
      question.is_expired = is_expired;
    }
    question.is_voted =  cookie != null;

    if(profile == null || profile.id == null){
      question.is_favorite = false;
    } else {
      question.is_favorite = await models.favorites.isFavorite(Number(profile.id), question.id);
    }

    return question;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

function isExpired(question){
  try {
    const published_at = new Date(question.published_at.getTime());
    const expired_at = published_at.setHours(published_at.getHours() + question.period_hours);
    const current = Date.now();
    return expired_at < current;
  } catch (e) {
    console.log(e);
    return null;
  }
}

module.exports = {
  setEnqueteValues: setEnqueteValues,
  setVoteValues: setVoteValues,
  setConditions: setConditions,
  isExpired: isExpired,
  images: images,
};
