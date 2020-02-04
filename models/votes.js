'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Votes';
const commons = require('./common_methods');
const answers = require('./answers');
const questions = require('./questions');
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
  let irregularFlag = false;
  vote.answer_ids.forEach(answer_id => {
    if(isNaN(answer_id)) irregularFlag = true;
  });
  if(vote.answer_ids === null || vote.answer_ids.length === 0 || irregularFlag){
    return cb(null, vote);
  }
  questions.read(vote.question_id, (err) => {
    if (err) {
      console.log('ERROR: failed to read question with id: ', vote.question_id);
      console.log('ERROR: ', err);
      return cb(err, null);
    }
    answers.read(vote.answer_ids, (err, entities) => {
      if(err){
        console.log('ERROR: failed to read answer with ids: ', vote.answer_ids);
        console.log('ERROR: ', err);
        return cb(err, null);
      } else if (entities.length != vote.answer_ids.length){
        console.log('ERROR: entities.length != vote.answer_ids.length with answer_ids: ', vote.answer_ids);
        err = {
          code: 404,
          message: 'Not found',
        };
        return cb(err, null);
      }
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
        questions.incrementCount(vote.question_id, err => {
          if (err) {
            console.log('ERROR: failed to update questions.count');
            return cb(err, null);
          }
          answers.incrementCount(vote.answer_ids, err => {
            if (err) {
              console.log('ERROR: failed to update answers.count');
              return cb(err, null);
            }
            vote.id = entity.key.id;
            return cb(null, vote);
          });
        });
      });
    });
  });
}

module.exports = {
  latest: latest,
  create: create
};
