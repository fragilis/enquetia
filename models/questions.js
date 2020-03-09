'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Questions';
const commons = require('./common_methods');
const answers = require('./answers');
const votes = require('./votes');
const excludeFromIndexes = ['answer_type', 'count', 'description', 'period_hours', 'title'];


async function popular(token) {
  try{
    const latestVotes = await votes.latest(token);
    return await read(latestVotes.map(vote => vote.question_id));
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function latest(limit, token) {
  try{
    const q = ds
      .createQuery([table])
      .filter('publish_status', 1)
      .order("published_at", {descending: true})
      .order("user_id")
      .limit(limit)
      .start(token);

    const [entities, info] = await ds.runQuery(q);
    const entities_filtered =  entities.filter(async (e) => {
      const deadline = await e.period_hours === -1 ? null : (new Date(e.published_at.getTime())).setHours(e.published_at.getHours() + e.period_hours);
      return deadline === null || deadline > Date.now();
    });

    const questions = entities.map(commons.fromDatastore);
    for(let question of questions){
      const answerList = await answers.findByParentId(question.id);
      if(answerList == null){
        throw new Error('AnswerList is empty.');
      }
      question.answers = answerList;
    }
    return questions.map(commons.fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function create(question, answerList){
  try {
    const key = ds.key(table);
    const entity = {
      key: key,
      data: commons.toDatastore(question, excludeFromIndexes),
    };

    const entity = await ds.save(entity);
    const answerList = await answers.create(answerList, entity.key.id);
    question.id = entity.key.id;

    return question;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function update(id, data) {
  try {
    return await commons.update(id, data, table);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function read(ids) {
  try {
    return await commons.read(ids, table);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function findById (ids) {
  try{
    const [question] = await commons.read(ids, table);
    if(question == null){
      throw new Error("Failed to read question.");
    }

    const answerList = await answers.findByParentId(question.id);
    if(answerList == null){
      throw new Error("Failed to read answerList.");
    }

    const answerListWithCount = await answers.getVoteCounts(answerList);
    if(answerListWithCount == null){
      throw new Error("Failed to read answerListWithCount.");
    }
    question.answers = answerListWithCount.map(answer => {
      const obj = {id: answer.id, value: answer.content, result: answer.count};
      return obj;
    });
    return question;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function vote(vote){
  try {
    if(vote == null || vote.answer_ids == null || vote.answer_ids.length === 0){
      throw new Error('Invalid vote.');
    }
    vote.answer_ids.forEach(answer_id => {
      if(isNaN(answer_id)){
        throw new Error('Invalid answer_id.');
      }
    });

    const myVote = await read(vote.question_id);
    if(myVote == []){
      throw new Error('myVote not found.');
    }

    const entities = await answers.read(vote.answer_ids);
    if (entities.length != vote.answer_ids.length){
      throw new Error('entities.length != vote.answer_ids.length.');
    }
    return await votes.create(vote);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function update(ids, data){
  try {
    return await commons.update(ids, data, excludeFromIndexes, table);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  read: read,
  findById: findById,
  create: create,
  latest: latest,
  popular: popular,
  vote: vote,
  update: update,
};
