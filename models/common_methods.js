'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();

function fromDatastore(obj) {
  obj.id = obj[Datastore.KEY].id;
  return obj;
}

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

function update(ids, data, exclude, table, cb) {
  const ids_array = ids instanceof Array ? ids : [ids];
  const data_array = data instanceof Array ? data : [data];

  if(ids_array.length != data_array.length){
    const err = {
      code: 400,
      message: 'Bad request',
    };
    return cb(err, null);
  }

  data_array.forEach(data => {
    const key = ds.key(table);
    const entity = {
      key: key,
      data: toDatastore(data, exclude),
    };
  });

  ds.save(data_array, err => {
    //data.id = entity.key.id;
    return cb(err, err ? null : data);
  });
}

function read(ids, table, cb) {
  const ids_array = ids instanceof Array ? ids : [ids];
  const keys = ids_array.map(id => ds.key([table, parseInt(id, 10)]));
  if(keys.length > 0){
    ds.get(keys, (err, entities) => {
      /*
      if (!err && !entities) {
        err = {
          code: 404,
          message: 'Not found',
        };
      }
      */
      if (err) {
        console.log('err: ', err)
        return cb(err);
      }
      return cb(null, entities.map(fromDatastore));
    });
  }
  else {
    return cb(null, []);
  }
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
