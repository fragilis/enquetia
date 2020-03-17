'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Favorites';
const commons = require('./common_methods');
const excludeFromIndexes = [];

async function find(user_id, question_id){
  try {
    const q = ds
      .createQuery([table])
      .filter('user_id', user_id)
      .filter('question_id', question_id);
    const [entities, info] = await ds.runQuery(q);
    return entities.map(commons.fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function findByQuestionId(question_id){
  try {
    const q = ds
      .createQuery([table])
      .filter('question_id', Number(question_id));
    const [entities, info] = await ds.runQuery(q);
    return entities.map(commons.fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function deleteByQuestionId(question_id){
  try {
    const favorites = await findByQuestionId(question_id);
    await _delete(favorites.map(favorite => Number(favorite.id)));
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function myFavorites(user_id){
  try {
    const q = ds
      .createQuery([table])
      .filter('user_id', user_id);
    const [entities, info] = await ds.runQuery(q);
    return entities.map(commons.fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function isFavorite(user_id, question_id){
  try {
    const entities = await find(user_id, question_id);
    return entities.length > 0;
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

async function _delete(ids){
  try {
    return await commons._delete(ids, table);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  find: find,
  findByQuestionId: findByQuestionId,
  deleteByQuestionId: deleteByQuestionId,
  myFavorites: myFavorites,
  isFavorite: isFavorite,
  create: create,
  _delete: _delete,
};

