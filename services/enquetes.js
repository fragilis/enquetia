'use strict';

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
    question.user_id = user.id;
  } else {
    question.user_id = 0;
  }
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
  return vite;
}

function setConditions(question){
  const published_at = new Date(question.published_at.getTime());
  const expired_at = published_at.setHours(published_at.getHours() + question.period_hours);
  const current = Date.now();
  const is_expired = expired_at < current ? true : false;
  const is_voted = req.cookies[req.params.question] != null;
  question.expired_at = expired_at;
  question.left_hours = (expired_at - current)/1000/60/60;
  question.is_expired = is_expired;
  question.is_voted = is_voted;

  return question;
}

module.exports = {
  setEnqueteValues: setEnqueteValues,
  setVoteValues: setVoteValues,
  setConditions: setConditions,
};
