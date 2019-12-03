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
const table = 'Questions';
const commons = require('./common_methods');
const answers = require('./answers');

// Lists all table in the Datastore sorted alphabetically by title.
// The ``limit`` argument determines the maximum amount of results to
// return per page. The ``token`` argument allows requesting additional
// pages. The callback is invoked with ``(err, table, nextPageToken)``.
function list(limit, token, cb) {

  console.log("table:",table);
  console.log("limit:",limit);
  console.log("token:",token);

  const q = ds
    .createQuery([table])
    .limit(limit)
    //.order("publishedAt")
    .order("user_id")
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

// Similar to ``list``, but only lists the table created by the specified
// user.
function find_by_id(id, token, cb) {
  const q = ds
    .createQuery([table])
    .filter('id', '=', id)
    .start(token);

  ds.runQuery(q, (err, entities) => {
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
  create: (data, cb) => {
    update(null, data, cb);
  },
  read: read,
  update: update,
  delete: _delete,
  list: list,
  find_by_id: find_by_id
};
