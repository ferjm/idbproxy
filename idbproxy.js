function proxifyIDBObject(idbObject, hooks) {
  var handler = {
    get: function(target, name, receiver) {
      console.log('Getting', name);
      if (!idbObject[name]) {
        return;
      }

      if (hooks[name]) {
        return hooks[name](idbObject);
      }

      if (idbObject[name].bind) {
        return idbObject[name].bind(idbObject);
      }

      return idbObject[name];
    }
  };

  return new Proxy(idbObject, handler);
}

function proxifyIDBObjectStore(transaction, objectStore) {
  const IDBObjectStoreHooks = {
    'put': () => {
      return new Proxy(() => {}, {
        apply: function(target, thisArg, args) {
          //XXX we can use the transaction here to check if the last_modified
          //    property of the object being modified is smaller than the one
          //    stored in the db.
          return objectStore.add.apply(objectStore, args);
        }
      });
    }
  };
  return proxifyIDBObject(objectStore, IDBObjectStoreHooks);
}

function proxifyIDBTransaction(transaction) {
  const IDBTransactionHooks = {
    'objectStore': (transaction) => {
      return new Proxy(() => {}, {
        apply: function(target, thisArg, args) {
          var objectStore = transaction.objectStore.apply(transaction, args);
          return proxifyIDBObjectStore(transaction, objectStore, {});
        }
      });
    }
  };
  return proxifyIDBObject(transaction, IDBTransactionHooks);
}

function proxifyIDBDatabase(idb) {
  const IDBDatabaseHooks = {
    'transaction': (idb) => {
      return new Proxy(() => {}, {
        apply: function(target, thisArg, args) {
          var transaction = idb.transaction.apply(idb, args);
          return proxifyIDBTransaction(transaction);
        }
      });
    }
  };

  return proxifyIDBObject(idb, IDBDatabaseHooks);
}

var proxifiedIDB = {
  open: function(dbName, dbVersion, dbUpgradePaths) {
    return new Promise((resolve, reject) => {
      if (!dbName || !dbVersion) {
        reject('Missing db name or db version');
        return;
      }

      var req = window.indexedDB.open(dbName, dbVersion);
      req.onsuccess = () => {
        // XXX Process sync  metadata.
        resolve(proxifyIDBDatabase(req.result));
      };
      req.onerror = () => {
        reject(req.error.name);
      };
      req.onupgradeneeded = (event) => {
        var db = event.target.result;
        // XXX create metadata objectstore for sync stuff.
        for (var i = 1; i <= dbVersion; i++) {
          dbUpgradePaths[i](db, event);
        }
      };
    });
  }
}
