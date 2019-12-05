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

module.exports = {
  latest: latest
};
