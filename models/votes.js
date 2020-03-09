'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Votes';
const commons = require('./common_methods');
const excludeFromIndexes = ['answer_ids'];

async function latest(token) {
  try{
    const now = new Date();
    const q = ds
      .createQuery([table])
      .filter('created_at', '>', new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes()))
      .start(token);
    const [entities, info] = await ds.runQuery(q);

    const entities_sorted = entities.map(commons.fromDatastore).reduce((acc, cur) => {
      const obj = acc.find(e => e.question_id === cur.question_id);
      if (obj === undefined) acc.push({question_id: cur.question_id, count: 1});
      else acc.find(e => e.question_id === cur.question_id).count++;
      return acc;
    }, []).sort((a, b) => {return a.count - b.count;});

    return entities_sorted;
  } catch (e) {
    console.log('ERROR: Failed to get latest votes.');
    throw new Error('ERROR: Failed to get latest votes.');
  }
}

async function create(vote, cb){
  try {
    const key = ds.key(table);
    const entity = {
      key: key,
      data: commons.toDatastore(vote, excludeFromIndexes),
    };

    const entity = await ds.save(entity);
    vote.id = entity.key.id;
    return vote;
  } catch (e) {
    console.log('ERROR: Failed to create a vote.');
    throw new Error('ERROR: Failed to create a vote.');
  }
}

async function sumCount(answerList){
  try {
    if(answerList == null || !(answerList instanceof Array) || answerList.length === 0) {
      throw new Error("Bad request.");
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
    console.log('ERROR: Failed to sum vote count.');
    throw new Error('ERROR: Failed to sum vote count.');
  }
}

/**
 * 1日以上前の投票を取得
 */
async function readOld(){
  try {
    const now = new Date();
    const q = ds.createQuery(table)
      .filter('created_at', '<', new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes()))
    const [votes, info] = await ds.runQuery(q);
    return votes.map(commons.fromDatastore);
  } catch (e) {
    console.log('ERROR: Failed to read old votes.');
    throw new Error('ERROR: Failed to read old votes.');
  }
}

async function _delete(ids){
  return await commons._delete(ids, table);
}

module.exports = {
  latest: latest,
  create: create,
  sumCount: sumCount,
  readOld: readOld,
  _delete: _delete,
};
