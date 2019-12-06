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

function create(answers, question_id, cb){
  const answers_array = answers instanceof Array ? answers : [answers];
  const entities = answers_array.map((answer, index) => {
    answer.question_id = question_id;
    answer.sortOrder = index;
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
    .order("sortOrder");

  ds.runQuery(q, (err, entities, nextQuery) => {
    if (err) {
      cb(err);
      return;
    }
    cb(null, entities.map(commons.fromDatastore));
  });
}

module.exports = {
  create: create,
  findByParentId: findByParentId,
};
