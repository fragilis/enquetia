'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Questions';
const commons = require('./common_methods');
const answers = require('./answers');
const votes = require('./votes');
const favorites = require('./favorites');
const excludeFromIndexes = ['answer_type', 'count', 'description', 'period_hours', 'title'];


async function popular(limit, token) {
  try{
    const latestVotes = await votes.latest();
    const questions = [];
    for(let question_id of latestVotes.map(vote => vote.question_id)){
      const question = await findById(question_id);
      questions.push(question);
    }
    const startAt = token == null ? 0 : Number(token);
    const hasMore = questions.length > startAt + limit ? startAt + limit : false;
    const topics = questions.slice(startAt, startAt + limit);

    return [topics.sort((a, b) => {return b.count - a.count}), hasMore];
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
      .limit(limit)
      .start(token);

    const [entities, info] = await ds.runQuery(q);
    const hasMore =
      info.moreResults !== Datastore.NO_MORE_RESULTS
        ? info.endCursor
        : false;
    /*
    const entities_filtered =  entities.filter(async (e) => {
      const deadline = await e.period_hours === -1 ? null : (new Date(e.published_at.getTime())).setHours(e.published_at.getHours() + e.period_hours);
      return deadline === null || deadline > Date.now();
    });
    */

    const questions = [];
    for(let entity of entities.map(commons.fromDatastore)){
      const question = await findById(entity.id);
      questions.push(question);
    }

    return [questions, hasMore];
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

    await ds.save(entity);
    await answers.create(answerList, entity.key.id);
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
    question.answers = answerListWithCount;
    const voteCount = await getVoteCount(question.id);
    question.count += voteCount;

    return question;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function getVoteCount(question_id){
  try {
    const entities = await votes.findByQuestionId(question_id);
    return entities.length;
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

async function myQuestions(user_id, limit, token){
  try {
    const q = ds
      .createQuery([table])
      .filter('user_id', user_id)
      .order("published_at", {descending: true})
      .limit(limit)
      .start(token);

    const [entities, info] = await ds.runQuery(q);

    const hasMore =
      info.moreResults !== Datastore.NO_MORE_RESULTS
        ? info.endCursor
        : false;

    const questions = [];
    for(let entity of entities.map(commons.fromDatastore)){
      const question = await findById(entity.id);
      questions.push(question);
    }

    return [questions, hasMore];
  }catch (e) {
    console.log(e);
    throw e;
  }
}

async function myFavorites(user_id, limit, token){
  try {
    const favs = await favorites.myFavorites(user_id);
    const entities = await read(favs.map(fav => fav.question_id));

    const questions = [];
    for(let entity of entities.map(commons.fromDatastore)){
      const question = await findById(entity.id);
      questions.push(question);
    }
    const startAt = token == null ? 0 : Number(token);
    const hasMore = questions.length > startAt + limit ? startAt + limit : false;
    const questions_sliced = questions.slice(startAt, startAt + limit);

    return [questions_sliced, hasMore];
  }catch (e) {
    console.log(e);
    throw e;
  }
}

async function _delete(ids){
  try {
    return await commons._delete(ids, table);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function deleteByQuestionId(question_id) {
  try {
    const transaction = await ds.transaction();
    await transaction.run();

    await _delete(question_id);
    await answers.deleteByQuestionId(question_id);

    await transaction.commit();

    await votes.deleteByQuestionId(question_id);
    await favorites.deleteByQuestionId(question_id);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  read: read,
  findById: findById,
  myQuestions: myQuestions,
  myFavorites: myFavorites,
  getVoteCount: getVoteCount,
  create: create,
  latest: latest,
  popular: popular,
  vote: vote,
  update: update,
  _delete: _delete,
  deleteByQuestionId: deleteByQuestionId,
};
