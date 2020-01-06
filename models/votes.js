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
const table = 'Votes';
const commons = require('./common_methods');
const answers = require('./answers');
const questions = require('./questions');
const excludeFromIndexes = ['answer_ids'];

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

function create(vote, cb){
  let irregularFlag = false;
  vote.answer_ids.forEach(answer_id => {
    if(isNaN(answer_id)) irregularFlag = true;
  });
  if(vote.answer_ids === null || vote.answer_ids.length === 0 || irregularFlag){
    cb(null, vote);
    return;
  }
  questions.read(vote.question_id, (err) => {
    if (err) {
      console.log('failed to read question with id: ', vote.question_id);
      cb(err, null);
      return;
    }
    answers.read(vote.answer_ids, (err, entities) => {
      if(err){
        console.log('failed to read answers with ids: ', vote.answer_ids);
        cb(err, null);
        return;
      }else if(entities.length != vote.answer_ids.length){
        console.log('the number of read entities differs from that of answer_ids: ', vote.answer_ids);
        err = {
          code: 404,
          message: 'Not found',
        };
        cb(err, null);
        return;
      }
      const key = ds.key(table);
      const entity = {
        key: key,
        data: commons.toDatastore(vote, excludeFromIndexes),
      };

      ds.save(entity, err => {
        if (err) {
          console.log('failed to save entity: ', entity);
          cb(err, null);
          return;
        }
        questions.incrementCount(vote.question_id, err => {
          if (err) {
            console.log('failed to update questions.count');
            cb(err, null);
            return;
          }
          answers.incrementCount(vote.answer_ids, err => {
            if (err) {
              console.log('failed to update answers.count');
              cb(err, null);
              return;
            }
            vote.id = entity.key.id;
            cb(null, vote);
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
