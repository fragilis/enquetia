'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Votes';
const commons = require('./common_methods');
const excludeFromIndexes = ['answer_ids'];

async function findByQuestionId(question_id){
  try {
    const q = await ds.createQuery([table])
      .filter('question_id', Number(question_id));
    const [votes, info] = await ds.runQuery(q);
    return votes.map(commons.fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function deleteByQuestionId(question_id){
  try {
    const votes = await findByQuestionId(question_id);
    await _delete(votes.map(vote => Number(vote.id)));
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function latest(token) {
  try{
    const now = new Date();
    const q = ds
      .createQuery([table])
      .filter('created_at', '>', new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes()))
      .start(token);
    const [entities, info] = await ds.runQuery(q);
    const questionIdsWithCounts = entities.map(commons.fromDatastore).reduce((acc, cur) => {
      const obj = acc.find(e => e.question_id === cur.question_id);
      if (obj === undefined) acc.push({question_id: cur.question_id, count: 1});
      else acc.find(e => e.question_id === cur.question_id).count++;
      return acc;
    }, []);

    return questionIdsWithCounts;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function create(vote){
  try {
    const key = ds.key(table);
    const entity = {
      key: key,
      data: commons.toDatastore(vote, excludeFromIndexes),
    };

    const [savedEntity, info] = await ds.save(entity);
    vote.id = entity.key.id;
    return vote;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function sumCount(answerList){
  try {
    if(answerList == null || !(answerList instanceof Array) || answerList.length === 0) {
      return answerList;
    }
    const q = ds
      .createQuery([table])
      .filter('question_id', Number(answerList[0].question_id));

    const [votes, info] = await ds.runQuery(q);
    votes.forEach(vote => {
      vote.answer_ids.forEach(answer_id => {
        if(answerList.filter(answer => answer.id == answer_id).length > 0) {
          answerList.filter(answer => answer.id == answer_id)[0].count++;
        }
      });
    });
    return answerList;
  } catch (e) {
    console.log(e);
    throw e;
  }
}

/**
 * 1日以上前の投票を取得
 */
async function readOld(){
  try {
    const now = new Date();
    const q = await ds.createQuery(table)
      .filter('created_at', '<', new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes()))
    const [votes, info] = await ds.runQuery(q);
    return votes.map(commons.fromDatastore);
  } catch (e) {
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

module.exports = {
  findByQuestionId: findByQuestionId,
  deleteByQuestionId: deleteByQuestionId,
  latest: latest,
  create: create,
  sumCount: sumCount,
  readOld: readOld,
  _delete: _delete,
};
