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
//const table = 'Questions';

// Translates from Datastore's entity format to
// the format expected by the application.
//
// Datastore format:
//   {
//     key: [table, id],
//     data: {
//       property: value
//     }
//   }
//
// Application format:
//   {
//     id: id,
//     property: value
//   }
function fromDatastore(obj) {
  obj.id = obj[Datastore.KEY].id;
  console.log("obj:",obj);
  return obj;
}

// Translates from the application's format to the datastore's
// extended entity property format. It also handles marking any
// specified properties as non-indexed. Does not translate the key.
//
// Application format:
//   {
//     id: id,
//     property: value,
//     unindexedProperty: value
//   }
//
// Datastore extended format:
//   [
//     {
//       name: property,
//       value: value
//     },
//     {
//       name: unindexedProperty,
//       value: value,
//       excludeFromIndexes: true
//     }
//   ]
function toDatastore(obj, nonIndexed) {
  nonIndexed = nonIndexed || [];
  let results = [];
  Object.keys(obj).forEach(k => {
    if (obj[k] === undefined) {
       return;
    }
    results.push({
      name: k,
      value: obj[k],
      excludeFromIndexes: nonIndexed.indexOf(k) !== -1,
    });
  });
  return results;
}

function update(id, data, table, cb) {
  let key;
  if (id) {
    key = ds.key([table, parseInt(id, 10)]);
  } else {
    key = ds.key(table);
  }

  const entity = {
    key: key,
    data: toDatastore(data, ['description']),
  };

  ds.save(entity, err => {
    data.id = entity.key.id;
    cb(err, err ? null : data);
  });
}

function read(ids, table, cb) {
  const ids_array = ids instanceof Array ? ids : [ids];
  const keys = ids_array.map(id => ds.key([table, parseInt(id, 10)]));
  if(keys.length > 0){
    ds.get(keys, (err, entities) => {
      if (!err && !entities) {
        err = {
          code: 404,
          message: 'Not found',
        };
      }
      if (err) {
        cb(err);
        return;
      }
      cb(null, entities.map(fromDatastore));
    });
  }
  else cb(null, []);
}

function _delete(id, table, cb) {
  const key = ds.key([table, parseInt(id, 10)]);
  ds.delete(key, cb);
}

module.exports = {
  fromDatastore: fromDatastore,
  toDatastore: toDatastore,
  update: update,
  read: read,
  _delete: _delete
};
