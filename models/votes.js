'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Votes';
const commons = require('./common_methods');
const excludeFromIndexes = ['answer_ids'];

function latest(token, cb) {
  const now = new Date();
  const q = ds
    .createQuery([table])
    .filter('created_at', '>', new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes()))
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      console.log("ERROR: ", err);
      return cb(err);
    }
    const entities_sorted = entities.map(commons.fromDatastore).reduce((acc, cur) => {
      const obj = acc.find(e => e.question_id === cur.question_id);
      if (obj === undefined) acc.push({question_id: cur.question_id, count: 1});
      else acc.find(e => e.question_id === cur.question_id).count++;
      return acc;
    }, []).sort((a, b) => {return a.count - b.count;});

    return cb(null, entities_sorted);
  });
}

function create(vote, cb){
  const key = ds.key(table);
  const entity = {
    key: key,
    data: commons.toDatastore(vote, excludeFromIndexes),
  };

  ds.save(entity, err => {
    if (err) {
      console.log('ERROR: failed to save entity: ', entity);
      return cb(err, null);
    }
    vote.id = entity.key.id;
    return cb(null, vote);
  });
}

function sumCount(answerList, cb){
  if(answerList == null || !(answerList instanceof Array) || answerList.length === 0) {
    const err = {
      code: 400,
      message: 'Bad request',
    };
    return cb(err);
  }

  const q = ds
    .createQuery([table])
    .filter('question_id', Number(answerList[0].question_id));
  ds.runQuery(q, (err, votes, nextQuery) => {
    if (err) {
      return cb(err);
    }
    votes.forEach(vote => {
      vote.answer_ids.forEach(answer_id => {
        if(answerList.filter(answer => answer.id == answer_id).length > 0) {
          answerList.filter(answer => answer.id == answer_id)[0].count++;
        }
      });
    });
    return cb(null, answerList);
  });
}

module.exports = {
  latest: latest,
  create: create,
  sumCount: sumCount,
};
