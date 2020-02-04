'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Answers';
const commons = require('./common_methods');
const excludeFromIndexes = ['content', 'count'];

function create(answers, question_id, cb){
  const answers_array = answers instanceof Array ? answers : [answers];
  const entities = answers_array.map((answer, index) => {
    answer.question_id = question_id;
    answer.sort_order = index;
    const key = ds.key(table);
    const entity = {
      key: key,
      data: commons.toDatastore(answer, excludeFromIndexes),
    };
    return entity;
  });

  ds.save(entities, err => {
    cb(err);
  });
}

function findByParentId(question_id, cb) {
  const q = ds
    .createQuery([table])
    .filter('question_id', question_id)
    .order("sort_order");

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      return cb(err);
    }
    return cb(null, entities.map(commons.fromDatastore));
  });
}

function incrementCount(ids, cb){
  commons.read(ids, table, (err, before) => {
    if (err) {
      console.log('failed to read answers. err: ', err);
      return cb(err);
    }
    const before_array = before instanceof Array ? before : [before];
    before_array.forEach(before => {
      before.id = undefined;
      before.count++;
    });
    commons.update(ids, before_array, excludeFromIndexes, table, (err, after_array) => {
      if (err) {
        console.log('failed to update answers. err: ', err);
        return cb(err);
      }
      return cb(null, after_array);
    });
  });
}

function read(id, cb) {
  commons.read(id, table, cb);
}

module.exports = {
  create: create,
  findByParentId: findByParentId,
  read: read,
  incrementCount: incrementCount,
};
