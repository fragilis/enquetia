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
        answers.getVoteCounts(answerList, (err3, answerListWithCount) => {
          if (err3) {
            console.log('failed to get vote counts. err: ', err3);
            return cb(err3);
          }
          question.answers = answerListWithCount.map(answer => {
            const obj = {id: answer.id, value: answer.content, result: answer.count};
            return obj;
          });
          return cb(null, question);
        });
      });
    }else return cb(null, question);
  });
}

function vote(vote, cb){
  if(vote == null || vote.answer_ids == null || vote.answer_ids.length === 0){
    return cb(null, vote);
  }
  vote.answer_ids.forEach(answer_id => {
    if(isNaN(answer_id)) return cb(null, vote);
  });

  read(vote.question_id, (err) => {
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
      return votes.create(vote, cb);
    });
  });
}

function update(ids, data, cb){
  return commons.update(ids, data, excludeFromIndexes, table, cb);
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
