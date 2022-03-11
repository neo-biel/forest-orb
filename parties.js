let joinedPartyId = null;
let updatePartyListTimer = null;
let skipPartyListUpdate = false;
let partyCache = {};

function setJoinedPartyId(partyId) {
  document.getElementById("content").classList.toggle("inParty", !!partyId);
  if (!partyId) {
    if (config.chatTabIndex === 3)
      document.getElementById('chatTabAll').click();
    if (config.playersTabIndex === 1)
      document.getElementById('playersTabMap').click();
  }
  joinedPartyId = partyId;
}

function updatePartyList() {
  const data = [];
  const partyIds = data.map(p => p.id);
  const removedPartyIds = Object.keys(partyCache).filter(p => partyIds.indexOf(p) === -1);

  for (let rp of removedPartyIds) {
    removePartyListEntry(rp);
    delete partyCache[rp];
  }

  const partyList = document.getElementById("partyList");
  
  if (data.length) {
    setJoinedPartyId(playerData ? data.find(p => p.members.map(m => m.uuid).indexOf(playerData.uuid) > -1)?.id : null);

    for (let party of data) {
      partyCache[party.id] = party;
      addOrUpdatePartyListEntry(party);
    }

    const partyListEntries = document.getElementsByClassName("partyListEntry");

    const entries = [].slice.call(partyListEntries).sort(function (a, b) {
      const partyA = partyCache[a.dataset.id];
      const partyB = partyCache[b.dataset.id];
      if (partyA.id === joinedPartyId)
        return -1;
      if (partyB.id === joinedPartyId)
        return 1;
      if (partyA.members.length === partyB.members.length)
        return partyA.id >= partyB.id ? 1 : -1;
      return partyA.members.length < partyB.members.length ? 1 : -1;
    });

    entries.forEach(ple => partyList.appendChild(ple));
  } else {
    setJoinedPartyId(null);

    partyList.innerHTML = "";

    const emptyMessage = document.createElement("div");
    emptyMessage.classList.add("infoMessage");

    const emptyMessageText = document.createElement("span");
    emptyMessageText.classList.add("infoLabel");
    emptyMessageText.innerText = localizedMessages.parties.emptyMessage;

    emptyMessage.appendChild(emptyMessageText);
    partyList.appendChild(emptyMessage);
  }

  let joinedPartyLabel = document.getElementById("joinedPartyLabel");
  let joinedPartyDivider = partyList.querySelector(".divider");

  if (joinedPartyId) {
    const joinedPartyLabelHtml = getMassagedLabel(localizedMessages.parties.yourParty, true);
    if (!joinedPartyLabel) {
      joinedPartyLabel = document.createElement("span");
      joinedPartyLabel.id = "joinedPartyLabel";
      joinedPartyLabel.classList.add("infoText");
      joinedPartyLabel.innerHTML = joinedPartyLabelHtml;
      partyList.prepend(joinedPartyLabel);
    } else
      joinedPartyLabel.innerHTML = joinedPartyLabelHtml;
    if (!joinedPartyDivider) {
      joinedPartyDivider = document.createElement("div");
      joinedPartyDivider.classList.add("divider");
    }
    partyList.querySelector(`.listEntry[data-id="${joinedPartyId}"]`).after(joinedPartyDivider);
  } else {
    joinedPartyLabel?.remove();
    joinedPartyDivider?.remove();
  }

  const activePartyModal = document.querySelector("#partyModal:not(.hidden)");
  if (activePartyModal)
    initOrUpdatePartyModal(activePartyModal.dataset.partyId);
}

function addOrUpdatePartyListEntry(party) {
  const isOwnParty = party.ownerUuid === playerData?.uuid;
  const isInParty = party.id === joinedPartyId;
  const partyList = document.getElementById("partyList");
  
  let partyListEntry = document.querySelector(`.partyListEntry[data-id="${party.id}"]`);

  const partyListEntrySprite = partyListEntry ? partyListEntry.querySelector(".partyListEntrySprite") : document.createElement("img");
  const nameText = partyListEntry ? partyListEntry.querySelector(".nameText") : document.createElement("span");
  const memberCount = partyListEntry ? partyListEntry.querySelector(".partyListEntryMemberCount") : document.createElement("div");
  const memberCountText = partyListEntry ? memberCount.querySelector(".partyListEntryMemberCountText") : document.createElement("span");
  const partyMemberSpritesContainer = partyListEntry ? partyListEntry.querySelector(".partyMemberSpritesContainer") : document.createElement("div");
  const partyListEntryActionContainer = partyListEntry ? partyListEntry.querySelector(".partyListEntryActionContainer") : document.createElement("div");

  if (!partyListEntry) {
    partyListEntry = document.createElement("div");
    partyListEntry.classList.add("partyListEntry");
    partyListEntry.classList.add("listEntry");
    partyListEntry.dataset.id = party.id;

    partyListEntrySprite.classList.add("partyListEntrySprite");
    partyListEntrySprite.classList.add("listEntrySprite");

    partyListEntry.appendChild(partyListEntrySprite);

    const detailsContainer = document.createElement("div");
    detailsContainer.classList.add("detailsContainer");

    const partyNameContainer = document.createElement("div");
    partyNameContainer.classList.add("partyNameContainer");

    nameText.classList.add("nameText");

    memberCount.classList.add("partyListEntryMemberCount");

    memberCountText.classList.add("partyListEntryMemberCountText");
    
    memberCount.appendChild(document.getElementsByTagName("template")[6].content.cloneNode(true));
    memberCount.appendChild(memberCountText);

    partyMemberSpritesContainer.classList.add("partyMemberSpritesContainer");

    partyNameContainer.appendChild(nameText);
    partyNameContainer.appendChild(memberCount);
    detailsContainer.appendChild(partyNameContainer);
    detailsContainer.appendChild(partyMemberSpritesContainer);
    partyListEntry.appendChild(detailsContainer);

    partyListEntryActionContainer.classList.add("partyListEntryActionContainer");
    partyListEntryActionContainer.classList.add("listEntryActionContainer");

    if (isInParty) {
      const leaveAction = document.createElement("a");
      leaveAction.classList.add("listEntryAction")
      leaveAction.href = "javascript:void(0);";
      leaveAction.onclick = function () {
        if (true) {
          setJoinedPartyId(null);
          document.getElementById("content").classList.remove("inParty");
          skipPartyListUpdate = true;
          updatePartyList(true);
        }
      };
      leaveAction.appendChild(document.getElementsByTagName("template")[8].content.cloneNode(true));
      partyListEntryActionContainer.appendChild(leaveAction);
    } else if (!joinedPartyId) {
      const joinAction = document.createElement("a");
      joinAction.classList.add("listEntryAction")
      joinAction.href = "javascript:void(0);";
      joinAction.onclick = function () {
        if (true) {
          setJoinedPartyId(joinedPartyId);
          document.getElementById("content").classList.add("inParty");
          skipPartyListUpdate = true;
          updatePartyList(true);
        }
      };
      joinAction.appendChild(document.getElementsByTagName("template")[7].content.cloneNode(true));
      partyListEntryActionContainer.appendChild(joinAction);
    }

    const infoAction = document.createElement("a");
    infoAction.classList.add("listEntryAction")
    infoAction.href = "javascript:void(0);";
    infoAction.onclick = function () {
      initOrUpdatePartyModal(party.id);
      openModal("partyModal", partyCache[party.id].systemName);
    };
    infoAction.appendChild(document.getElementsByTagName("template")[5].content.cloneNode(true));
    partyListEntryActionContainer.appendChild(infoAction);

    partyListEntry.appendChild(partyListEntryActionContainer);

    partyList.appendChild(partyListEntry);
  } else
    partyMemberSpritesContainer.innerHTML = "";

  partyListEntry.classList.toggle("joinedParty", joinedPartyId);

  const systemName = party.systemName.replace(/'/g, "");
  if (gameUiThemes.indexOf(systemName) === -1)
    systemName = getDefaultUiTheme();
  const parsedSystemName = systemName.replace(" ", "_");
  initUiThemeContainerStyles(systemName);
  initUiThemeFontStyles(systemName, 0);
  partyListEntry.setAttribute("style", `background-image: var(--container-bg-image-url-${parsedSystemName}) !important; border-image: var(--border-image-url-${parsedSystemName}) 8 repeat !important;`);
  getFontColors(systemName, 0, colors => {
    nameText.setAttribute("style", `background-image: var(--base-gradient-${parsedSystemName}) !important`);
    memberCountText.setAttribute("style", `background-image: var(--base-gradient-${parsedSystemName}) !important`);
    addSystemSvgGradient(systemName, colors);
    memberCount.querySelector("path").style.fill = `url(#baseGradient_${parsedSystemName})`;
    for (let iconPath of partyListEntryActionContainer.querySelectorAll("path"))
      iconPath.style.fill = `url(#baseGradient_${parsedSystemName})`;
  });
  getFontShadow(systemName, shadow => {
    nameText.style.filter = `drop-shadow(1.5px 1.5px var(--shadow-color-${parsedSystemName}))`;
    memberCountText.style.filter = `drop-shadow(1.5px 1.5px var(--shadow-color-${parsedSystemName}))`;
    addSystemSvgDropShadow(systemName, shadow);
    memberCount.querySelector("path").style.filter = `url(#dropShadow_${parsedSystemName})`;
    for (let iconPath of partyListEntryActionContainer.querySelectorAll("path"))
      iconPath.style.filter = `url(#dropShadow_${parsedSystemName})`;
  });

  const ownerMemberIndex = party.members.map(m => m.uuid).indexOf(party.ownerUuid);
  const ownerMember = party.members[ownerMemberIndex];

  partyListEntrySprite.title = ownerMember.name;

  if (ownerMember.rank)
    partyListEntrySprite.title += rankEmojis[ownerMember.rank];

  if (!ownerMember.online) {
    partyListEntrySprite.classList.add("offline");
    partyListEntrySprite.title += localizedMessages.parties.offlineMemberSuffix;
  }

  const partyPlayerList = document.getElementById("partyPlayerList");

  if (isInParty) {
    const oldMemberUuids = Array.from(partyPlayerList.querySelectorAll('.listEntry')).map(e => e.dataset.uuid);
    const removedMemberUuids = oldMemberUuids.filter(uuid => !party.members.find(m => m.uuid === uuid));

    for (let uuid of removedMemberUuids)
      removePartyListEntry(uuid);
  }

  for (let m = 0; m < party.members.length; m++) {
    const memberIndex = m;

    const member = party.members[memberIndex];

    globalPlayerData[member.uuid] = {
      name: member.name,
      systemName: member.systemName,
      rank: member.rank
    };

    if (isInParty)
      addOrUpdatePlayerListEntry(partyPlayerList, member.systemName, member.name, member.uuid);

    if (memberIndex === ownerMemberIndex)
      continue;

    const playerSpriteCacheEntry = (playerSpriteCache[member.uuid] = { sprite: member.spriteName, idx: member.spriteIndex });

    getSpriteImg(playerSpriteCacheEntry.sprite, playerSpriteCacheEntry.idx, function (spriteImg) {
      if (!memberIndex) {
        partyListEntrySprite.src = spriteImg;
      } else {
        const spriteImg = document.createElement("img");
        spriteImg.classList.add("partyListEntrySprite");
        spriteImg.classList.add("listEntrySprite");
        spriteImg.title = member.name;
        if (member.rank)
          spriteImg.title += rankEmojis[member.rank];
        if (!member.online) {
          spriteImg.classList.add("offline");
          spriteImg.title += localizedMessages.parties.offlineMemberSuffix;
        }
        partyMemberSpritesContainer.appendChild(spriteImg);
      }
    });
  }

  nameText.innerText = party.name || localizedMessages.parties.defaultPartyName.replace("{OWNER}", ownerMember.name);

  memberCountText.innerText = party.members.length;
}

function removePartyListEntry(id) {
  const partyListEntry = document.querySelector(`.partyListEntry[data-id="${id}"]`);
  if (partyListEntry)
    partyListEntry.remove();
}

function clearPartyList() {
  const partyList = document.getElementById("partyList");
  partyList.innerHTML = "";
  updateMapPlayerCount(0);
}

function initOrUpdatePartyModal(partyId) {
  const party = partyCache[partyId];
  const partyModal = document.getElementById("partyModal");
  const partyModalOnlinePlayerList = document.getElementById("partyModalOnlinePlayerList");
  const partyModalOfflinePlayerList = document.getElementById("partyModalOfflinePlayerList");
  const ownerMemberIndex = party.members.map(m => m.uuid).indexOf(party.ownerUuid);

  const lastPartyId = partyModal.dataset.partyId;
  partyModal.querySelector(".modalTitle").innerText = party.name || localizedMessages.parties.defaultPartyName.replace("{OWNER}", party.members[ownerMemberIndex].name);

  let onlineCount = 0;
  let offlineCount = 0;

  if (lastPartyId) {
    if (partyId === lastPartyId) {
      const oldOnlinePlayerUuids = Array.from(partyModalOnlinePlayerList.querySelectorAll('.listEntry')).map(e => e.dataset.uuid);
      const oldOfflinePlayerUuids = Array.from(partyModalOfflinePlayerList.querySelectorAll('.listEntry')).map(e => e.dataset.uuid);

      const removedOnlinePlayerUuids = oldOnlinePlayerUuids.filter(uuid => !party.members.find(m => m.uuid === uuid && m.online));
      const removedOfflinePlayerUuids = oldOfflinePlayerUuids.filter(uuid => !party.members.find(m => m.uuid === uuid && !m.online));

      for (let onlinePlayerUuid of removedOnlinePlayerUuids)
        removePlayerListEntry(partyModalOnlinePlayerList, onlinePlayerUuid);
      for (let offlinePlayerUuid of removedOfflinePlayerUuids)
        removePlayerListEntry(partyModalOfflinePlayerList, offlinePlayerUuid);
    } else {
      clearPlayerList(partyModalOnlinePlayerList);
      clearPlayerList(partyModalOfflinePlayerList);
    }
  }

  partyModal.dataset.partyId = partyId;

  for (let member of party.members) {
    const playerList = member.online ? partyModalOnlinePlayerList : partyModalOfflinePlayerList;
    if (member.online)
      onlineCount++;
    else
      offlineCount++;
    addOrUpdatePlayerListEntry(playerList, member.systemName, member.name, member.uuid);
  }

  const onlineCountLabel = document.getElementById("partyModalOnlineCount");
  const offlineCountLabel = document.getElementById("partyModalOfflineCount");
  
  onlineCountLabel.innerText = localizedMessages.parties.onlineCount.replace("{COUNT}", onlineCount);
  offlineCountLabel.innerText = localizedMessages.parties.offlineCount.replace("{COUNT}", offlineCount);

  onlineCountLabel.classList.toggle("hidden", !onlineCount);
  offlineCountLabel.classList.toggle("hidden", !offlineCount);
}