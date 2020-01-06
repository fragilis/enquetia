// icensed under the Apache License, Version 2.0 (the "License");
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
const excludeFromIndexes = ['answer_type', 'count', 'description', 'period_hours', 'title'];

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
    .filter('publish_status', 1)
    .order("published_at")
    .order("user_id")
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

// Similar to ``list``, but only lists the table created by the specified
// user.
/*
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
*/

function create(question, answerList, cb){
  const key = ds.key(table);
  const entity = {
    key: key,
    data: commons.toDatastore(question, excludeFromIndexes),
  };

  ds.save(entity, err => {
    if (err) {
      cosnole.log('failed to save entity: ', entity);
      cb(err, null);
    }
    answers.create(answerList, entity.key.id, err2 => {
      if (err2) {
        cosnole.log('failed to save answerList: ', answerList);
        cb(err2, null);
      }
      question.id = entity.key.id;
      cb(null, question);
    });
  });
}

function update(id, data, cb) {
  commons.update(id, data, table, cb);
}

function read(id, cb) {
  commons.read(id, table, cb);
}

function findById (ids, cb) {
  commons.read(ids, table, (err, [question]) => {
    if (err) {
      console.log('failed to read question. err: ', err);
      cb(err);
      return;
    }
    if(question !== undefined){
      answers.findByParentId(question.id, (err2, answerList) => {
        if (err2) {
          console.log('failed to read answers. err: ', err2);
          cb(err2);
          return;
        }
        question.answers = answerList.map(answer => {
          const obj = {id: answer.id, value: answer.content};
          return obj;
        });
        cb(null, question);
        return;
      });
    }else cb(null, question);
  });
}

function incrementCount(id, cb){
  commons.read(id, table, (err, [before]) => {
    if (err) {
      console.log('failed to read question. err: ', err);
      cb(err);
      return;
    }
    before.id = undefined;
    before.count++;
    commons.update(id, before, excludeFromIndexes, table, (err, after) => {
      if (err) {
        console.log('failed to update question. err: ', err);
        cb(err);
        return;
      }
      cb(null, after);
    });
  });
}

module.exports = {
  read: read,
  findById: findById,
  create: create,
  list: list,
  incrementCount: incrementCount,
};
