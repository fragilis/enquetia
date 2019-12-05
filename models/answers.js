// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();
const table = 'Answers';
const commons = require('./common_methods');
const excludeFromIndexes = ['content', 'count'];

// Lists all table in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, table, nextPageToken)``.
function latest(token, cb) {

  console.log("table:",table);
  console.log("token:",token);

  const now = new Date();
  const q = ds
    .createQuery([table])
    .filter('created_at', '>', new Date(now.getFullYear(), now.getMonth(), now.getDate()-1, now.getHours(), now.getMinutes()))
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    cb(null, entities.map(commons.fromDatastore));
  });
}

// Similar to ``list``, but only lists the table created by the specified
// user.
function listBy(userId, limit, token, cb) {
  const q = ds
    .createQuery([table])
    .filter('user_id', '=', userId)
    .limit(limit)
    .start(token);

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    const hasMore =
      nextQuery.moreResults !== Datastore.NO_MORE_RESULTS
        ? nextQuery.endCursor
        : false;
    cb(null, entities.map(commons.fromDatastore), hasMore);
  });
}

function create(answers, question_id, cb){
  const answers_array = answers instanceof Array ? answers : [answers];
  const entities = answers_array.map(answer => {
    answer.question_id = question_id;
    const key = ds.key(table);
    const entity = {
      key: key,
      data: commons.toDatastore(answer, ['description']),
    };
    return entity;
  });

  ds.save(entities, err => {
    cb(err);
  });
}

function update(id, data, cb) {
  commons.update(id, data, cb, table);
}

function read(ids, cb) {
  commons.read(id, data, cb, table);
}

function _delete(id, cb) {
  commons._delete(id, data, cb, table);
}

module.exports = {
  create: create,
  /*
  read: read,
  update: update,
  delete: _delete,
  list: list,
  listBy: listBy,
  */
};
