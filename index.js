var req = window.indexedDB.deleteDatabase('proxifiedIDBTest');
req.onsuccess = () => {
  proxifiedIDB.open('proxifiedIDBTest', 1, {
    '1': (db, event) => {
      var store = db.createObjectStore('dummyStore', {
        keyPath: 'id'
      });
    }
  }).then((db) => {
    var transaction = db.transaction('dummyStore',
                                     'readwrite');
    var objectStore = transaction.objectStore('dummyStore');
    objectStore.put({ id: 'whatever', dummy: 'dummy' }).onsuccess = (e) => {
      console.log('Object stored');
    };
  }).catch((e) => {
    console.error('Oh crap!', e);
  });
};
