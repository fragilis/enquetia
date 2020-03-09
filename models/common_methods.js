'use strict';

const {Datastore} = require('@google-cloud/datastore');
const ds = new Datastore();

function fromDatastore(obj) {
  obj.id = parseInt(obj[Datastore.KEY].id);
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

async function update(ids, data, exclude, table) {
  try {
    const ids_array = (ids instanceof Array ? ids : [ids]).map(id => parseInt(id)).filter(id => !isNaN(id));
    const data_array = data instanceof Array ? data : [data];
    if(ids_array.length != data_array.length){
      throw new Error('Bad request.');
    }
    data_array.forEach(data => {
      const key = ds.key(table);
      const entity = {
        key: key,
        data: toDatastore(data, exclude),
      };
    });
    return await ds.save(data_array);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function read(ids, table) {
  try {
    const ids_array = (ids instanceof Array ? ids : [ids]).map(id => parseInt(id)).filter(id => !isNaN(id));
    const keys = ids_array.map(id => ds.key([table, parseInt(id, 10)]));
    if(keys.length == 0) return [];
    const [entities] = await ds.get(keys);
    return await entities.map(fromDatastore);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

async function _delete(ids, table) {
  try {
    const ids_array = (ids instanceof Array ? ids : [ids]).map(id => parseInt(id)).filter(id => !isNaN(id));
    const keys = ids_array.map(id => ds.key([table, parseInt(id, 10)]));
    return await ds.delete(keys);
  } catch (e) {
    console.log(e);
    throw e;
  }
}

module.exports = {
  fromDatastore: fromDatastore,
  toDatastore: toDatastore,
  update: update,
  read: read,
  _delete: _delete
};
