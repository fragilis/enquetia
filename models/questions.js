'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Questions';
const commons = require('./common_methods');
const answers = require('./answers');
const votes = require('./votes');
const excludeFromIndexes = ['answer_type', 'count', 'description', 'period_hours', 'title'];


function popular(token, cb) {
  votes.latest(token, (err, votes) => {
    if(err) {
      return cb(err);
    }
    return read(votes.map(vote => vote.question_id), cb);
  });
}

function latest(limit, token, cb) {
  const q = ds
    .createQuery([table])
    .filter('publish_status', 1)
    .order("published_at")
    .order("user_id")
    .limit(limit)
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      return cb(err);
    }
    const entities_filtered = entities.filter( e => {
      const deadline = e.period_hours === -1 ? null : (new Date(e.published_at.getTime())).setHours(e.published_at.getHours() + e.period_hours);
      return deadline === null || deadline > Date.now();
    });
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    return cb(null, entities.map(commons.fromDatastore), hasMore);
  });
}

function create(question, answerList, cb){
  const key = ds.key(table);
  const entity = {
    key: key,
    data: commons.toDatastore(question, excludeFromIndexes),
  };

  ds.save(entity, err => {
    if (err) {
      cosnole.log('failed to save entity: ', entity);
      return cb(err, null);
    }
    answers.create(answerList, entity.key.id, err2 => {
      if (err2) {
        cosnole.log('failed to save answerList: ', answerList);
        return cb(err2, null);
      }
      question.id = entity.key.id;
      return cb(null, question);
    });
  });
}

function update(id, data, cb) {
  commons.update(id, data, table, cb);
}

function read(ids, cb) {
  commons.read(ids, table, cb);
}

function findById (ids, cb) {
  commons.read(ids, table, (err, [question]) => {
    if (err) {
      console.log('failed to read question. err: ', err);
      return cb(err);
    }
    if(question !== undefined){
      answers.findByParentId(question.id, (err2, answerList) => {
        if (err2) {
          console.log('failed to read answers. err: ', err2);
          return cb(err2);
        }
        question.answers = answerList.map(answer => {
          const obj = {id: answer.id, value: answer.content, result: answer.count};
          return obj;
        });
        return cb(null, question);
      });
    }else return cb(null, question);
  });
}

function incrementCount(id, cb){
  commons.read(id, table, (err, [before]) => {
    if (err) {
      console.log('failed to read question. err: ', err);
      return cb(err);
    }
    before.id = undefined;
    before.count++;
    commons.update(id, before, excludeFromIndexes, table, (err, after) => {
      if (err) {
        console.log('failed to update question. err: ', err);
        return cb(err);
      }
      return cb(null, after);
    });
  });
}

module.exports = {
  read: read,
  findById: findById,
  create: create,
  latest: latest,
  popular: popular,
  incrementCount: incrementCount,
};
