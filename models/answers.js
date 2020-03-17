'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Answers';
const commons = require('./common_methods');
const excludeFromIndexes = ['content', 'count'];
const votes = require('./votes');

async function create(answers, question_id){
  try {
    const answers_array = answers instanceof Array ? answers : [answers];
    const entities = answers_array.map((answer, index) => {
      answer.question_id = parseInt(question_id);
      answer.sort_order = index;
      const key = ds.key(table);
      const entity = {
        key: key,
        data: commons.toDatastore(answer, excludeFromIndexes),
      };
      return entity;
    });

    await ds.save(entities);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function findByParentId(question_id) {
  try{
    const q = ds
      .createQuery([table])
      .filter('question_id', Number(question_id))
      .order("sort_order");

    const [entities, info] = await ds.runQuery(q);
    return entities.map(commons.fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function read(ids) {
  try {
    return commons.read(ids, table);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function getVoteCounts(answerList){
  try {
    return await votes.sumCount(answerList);
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
    const answers = await findByParentId(question_id);
    await _delete(answers.map(answer => Number(answer.id)));
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  create: create,
  findByParentId: findByParentId,
  read: read,
  getVoteCounts: getVoteCounts,
  update: update,
  _delete: _delete,
  deleteByQuestionId: deleteByQuestionId,
};
