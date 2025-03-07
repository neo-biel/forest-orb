let saveSyncConfig = {
  enabled: false,
  slotId: 0
};

function initSaveSyncControls() {
  document.getElementById('saveSyncButton').onclick = function () {
    setSaveSyncEnabled(!this.classList.contains('toggled'));
  };

  const saveSyncSlotSelect = document.getElementById('saveSyncSlotId');
  for (let s = 1; s <= 15; s++) {
    const slotOption = document.createElement('option');
    slotOption.innerText = s;
    saveSyncSlotSelect.appendChild(slotOption);
  }

  document.getElementById('saveSyncSlotId').onchange = function () {
    saveSyncConfig.slotId = this.value;
    updateConfig(saveSyncConfig, false, 'saveSyncConfig');
    if (this.value) {
      hasSaveDataForSync().then(hasSaveData => {
        if (hasSaveData) {
          apiFetch('saveSync?command=timestamp')
            .then(response => {
              if (!response.ok)
                throw new Error('Failed to retrieve timestamp for save sync data');
              return response.text();
            })
            .then(timestamp => {
              getSaveDataForSync().then(saveData => {
                if (saveData && (!timestamp || saveData.timestamp > new Date(timestamp)))
                  uploadSaveSyncData(saveData).then(success => {
                    if (success)
                      document.getElementById('clearSaveSyncButton').removeAttribute('disabled');
                  });
              });
            })
            .catch(err => console.error(err));
        }
      });
    }
  };

  document.getElementById('clearSaveSyncButton').onclick = function () {
    const button = this;
    clearSaveSyncData().then(success => {
      if (success)
        button.setAttribute('disabled', true);
    })
  };

  if (getCookie(sessionIdKey)) {
    apiFetch('saveSync?command=timestamp')
      .then(response => {
        if (!response.ok)
          throw new Error('Failed to retrieve timestamp for save sync data');
        return response.text();
      })
      .then(timestamp => {
        const clearSaveSyncButton = document.getElementById('clearSaveSyncButton');
        if (timestamp)
          clearSaveSyncButton.removeAttribute('disabled');
        else
          clearSaveSyncButton.setAttribute('disabled', true);
      });
  }
}

function initSaveDataControls() {
  document.getElementById('uploadButton').onclick = function () {
    let saveFile = document.getElementById('saveFile');
    if (saveFile)
      saveFile.remove();
  
    saveFile = document.createElement('input');
    saveFile.type = 'file';
    saveFile.id = 'saveFile';
    saveFile.style.display = 'none';
    saveFile.addEventListener('change', handleSaveFileUpload);
    saveFile.click();
  };
  
  document.getElementById('downloadButton').onclick = handleSaveFileDownload;
}

function handleSaveFileUpload(evt) {
  const save = evt.target.files[0];

  if (!/\.lsd$/i.test(save.name)) {
    alert(localizedMessages.io.upload.invalidSaveFile);
    document.getElementById('uploadButton').click();
    return;
  }

  const saveSlot = getSaveSlot();

  if (saveSlot == null)
    return;

  const request = indexedDB.open(`/easyrpg/${ynoGameId}/Save`);

  request.onsuccess = function (_e) {

    const reader = new FileReader();
    let readerResult;

    reader.onload = function (file) {
      readerResult = file.currentTarget.result;
      const saveFile = { timestamp: new Date(), mode: 33206, contents: new Uint8Array(readerResult) };
  
      const db = request.result; 
      const transaction = db.transaction(['FILE_DATA'], 'readwrite');
      const objectStorePutRequest = transaction.objectStore('FILE_DATA').put(saveFile, `/easyrpg/${ynoGameId}/Save/Save${saveSlot}.lsd`);

      objectStorePutRequest.onsuccess = function (_e) {
        setTimeout(() => window.location = window.location, 100);
      };
    };

    reader.readAsArrayBuffer(save);
  };
}

function handleSaveFileDownload() {
  const request = indexedDB.open(`/easyrpg/${ynoGameId}/Save`);

  request.onsuccess = function (_e) {
    const saveSlot = getSaveSlot(true);

    if (saveSlot == null)
      return;

    const db = request.result; 
    const transaction = db.transaction(['FILE_DATA'], 'readwrite');
    const objectStore = transaction.objectStore('FILE_DATA');
    const objectStoreRequest = objectStore.get(`/easyrpg/${ynoGameId}/Save/Save${saveSlot}.lsd`);

    objectStoreRequest.onsuccess = function (_e) {
      const record = objectStoreRequest.result;

      if (!record) {
        alert(localizedMessages.io.download.emptySlot);
        return;
      }

      const blob = new Blob([record.contents], {type: 'text/json'});
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.download = `Save${saveSlot}.lsd`;
      link.click();
      link.remove();
    };
  };
}

function getSaveSlot(download) {
  let fileIndex = prompt(localizedMessages.io[download ? 'download' : 'upload'].slotInput, 1);
  let fileIndexInt;

  while (fileIndex != null && !/^\d+$/.test(fileIndex) || (fileIndexInt = parseInt(fileIndex)) < 1 || fileIndexInt > 15)
    fileIndex = prompt(localizedMessages.io.common.failedSlotInput);

  if (fileIndex == null)
    return null;

  return fileIndexInt < 10 ? `0${fileIndexInt}` : fileIndexInt.toString();
}

function setSaveSyncEnabled(enabled, isInit) {
  const saveSyncButton = document.getElementById('saveSyncButton');
  const toggle = function () {
    saveSyncButton.classList.toggle('toggled', enabled);
    document.getElementById('saveSyncSlotIdRow').classList.toggle('hidden', !enabled);
    if (enabled)
      document.getElementById('saveSyncSlotId').value = 0;
    if (!isInit) {
      saveSyncConfig.enabled = enabled;
      updateConfig(saveSyncConfig, false, 'saveSyncConfig');
    }
  };
  if (!isInit && !saveSyncButton.classList.contains('toggled')) {
    if (confirm(localizedMessages.saveSync.confirmEnable)) {
      apiFetch('saveSync?command=timestamp')
        .then(response => {
          if (!response.ok)
            throw new Error('Failed to retrieve timestamp for save sync data');
          return response.text();
        })
        .then(timestamp => {
          if (!timestamp || confirm(localizedMessages.saveSync.confirmEnableWithData))
            toggle();
        })
        .catch(err => console.error(err));
    }
  } else
    toggle();
}

// EXTERNAL
function onSaveSlotUpdated(slotId) {
  if (loginToken && saveSyncConfig.enabled && slotId == saveSyncConfig.slotId)
    getAndUploadSaveSyncData();
}

function hasSaveDataForSync() {
  return new Promise(resolve => {
    if (!saveSyncConfig.slotId)
      resolve(false);
    const request = indexedDB.open(`/easyrpg/${ynoGameId}/Save`);

    request.onsuccess = function (_e) {
      const db = request.result; 
      const transaction = db.transaction(['FILE_DATA'], 'readwrite');
      const objectStore = transaction.objectStore('FILE_DATA');
      const objectStoreRequest = objectStore.get(`/easyrpg/${ynoGameId}/Save/Save${saveSyncConfig.slotId}.lsd`);

      objectStoreRequest.onsuccess = () => resolve(true);
      objectStoreRequest.onerror = () => resolve(false);
    };
  });
}

function getSaveDataForSync() {
  return new Promise(resolve => {
    if (!saveSyncConfig.slotId)
      resolve(null);

    const slotId = saveSyncConfig.slotId < 10 ? `0${saveSyncConfig.slotId}` : saveSyncConfig.slotId.toString();
    const request = indexedDB.open(`/easyrpg/${ynoGameId}/Save`);

    request.onsuccess = function (_e) {
      const db = request.result; 
      const transaction = db.transaction(['FILE_DATA'], 'readwrite');
      const objectStore = transaction.objectStore('FILE_DATA');
      const objectStoreRequest = objectStore.get(`/easyrpg/${ynoGameId}/Save/Save${slotId}.lsd`);

      objectStoreRequest.onsuccess = () => resolve(objectStoreRequest.result);
      objectStoreRequest.onerror = () => resolve(null);
    };
  });
}

function uploadSaveSyncData(saveData) {
  return new Promise(resolve => {
    if (!loginToken || !saveSyncConfig.enabled)
      resolve(false);
    showSaveSyncToastMessage('saveUploading', 'saveUpload', saveSyncConfig.slotId);
    apiJsonPost(`saveSync?command=push&timestamp=${saveData.timestamp.toISOString()}`, saveData)
      .then(_ => {
        showSaveSyncToastMessage('saveUploaded', 'save', saveSyncConfig.slotId);
        resolve(true);
      })
      .catch(_err => resolve(false));
  });
}

function getAndUploadSaveSyncData() {
  return new Promise(resolve => {
    if (!saveSyncConfig.slotId)
      resolve(false);

    getSaveDataForSync().then(saveData => uploadSaveSyncData(saveData).then(success => resolve(success)));
  });
}

function trySyncSave() {
  return new Promise(resolve => {
    apiFetch('saveSync?command=timestamp')
      .then(response => {
        if (!response.ok)
          throw new Error('Failed to retrieve timestamp for save sync data');
        return response.text();
      })
      .then(timestamp => {
        getSaveDataForSync().then(saveData => {
          if (timestamp && (!saveData || saveData.timestamp < new Date(timestamp))) {
            apiFetch('saveSync?command=get').then(response => {
              if (!response.ok)
                throw new Error('Failed to get save sync data');
              return response.json();
            })
            .then(saveSyncData => {
              if (saveSyncData.hasOwnProperty('timestamp') && saveSyncData.hasOwnProperty('contents')) {
                const request = indexedDB.open(`/easyrpg/${ynoGameId}/Save`);

                request.onsuccess = function (_e) {
                  saveSyncData.timestamp = new Date(saveSyncData.timestamp);
                  saveSyncData.contents = Uint8Array.from(Object.values(saveSyncData.contents));

                  const slotId = saveSyncConfig.slotId < 10 ? `0${saveSyncConfig.slotId}` : saveSyncConfig.slotId.toString();

                  const db = request.result; 
                  const transaction = db.transaction(['FILE_DATA'], 'readwrite');
                  const objectStorePutRequest = transaction.objectStore('FILE_DATA').put(saveSyncData, `/easyrpg/${ynoGameId}/Save/Save${slotId}.lsd`);

                  objectStorePutRequest.onsuccess = _e => {
                    showSaveSyncToastMessage('saveDownloaded', 'save', saveSyncConfig.slotId);
                    resolve(true);
                  };
                  objectStorePutRequest.onerror = _err => resolve(false);
                };
                request.onerror = _err => resolve(false);
              } else
                resolve(false);
            })
            .catch(err => {
              console.error(err);
              resolve(false);
            })
          } else {
            showSaveSyncToastMessage('saveUpToDate', 'save', saveSyncConfig.slotId);
            resolve(false);
          }
        });
      })
      .catch(err => {
        console.error(err);
        resolve(false);
      });
    })
}

function clearSaveSyncData() {
  return new Promise(resolve => {
    if (!loginToken)
      resolve(false);
    apiFetch(`saveSync?command=clear`)
      .then(_ => {
        showSaveSyncToastMessage('saveCleared', 'save');
        resolve(true);
      })
      .catch(_err => resolve(false));
  });
}

let saveDataToastQueue = [];
let saveDataToastTimer = null;

function showSaveSyncToastMessage(key, icon, slotId) {
  if (!notificationConfig.saveSync.all || !notificationConfig.saveSync[key])
    return;
  if (typeof localizedMessages !== 'undefined' && localizedMessages) {
    let message = getMassagedLabel(localizedMessages.toast.saveSync[key], true);
    if (slotId !== undefined)
      message = message.replace('{SLOT}', slotId);
    showToastMessage(message, icon);
  } else {
    if (!saveDataToastTimer) {
      saveDataToastTimer = setInterval(() => {
        if (typeof localizedMessages !== 'undefined' && localizedMessages) {
          for (let toast of saveDataToastQueue)
            showSaveSyncToastMessage(toast.key, toast.icon, toast.slotId);
          clearInterval(saveDataToastTimer);
          saveDataToastTimer = null;
        }
      }, 100);
    }
    saveDataToastQueue.push({ key: key, icon: icon, slotId: slotId });
  }
}