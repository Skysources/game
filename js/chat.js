/* SKYZONE · CHAT SYSTEM (Firebase Realtime) */
window.SKY = window.SKY || {};
SKY.CHAT = (function() {
  var FB = null; // set after firebase-init loads
  var channels = { kavim: [], dunya: [], ozel: [], sistem: [] };
  var activeChannel = 'dunya';
  var expanded = false;
  var listeners = {}; // Firebase refs for detaching
  var playerName = '';
  var playerCity = '';
  var onNewMsg = null; // callback when new message arrives

  // NPC/bot names for simulated messages (only when server is empty)
  var BOT_NAME_KEYS = {
    kavim: ['chatbot.kavim_1', 'chatbot.kavim_2', 'chatbot.kavim_3', 'chatbot.kavim_4', 'chatbot.kavim_5', 'chatbot.kavim_6'],
    dunya: ['chatbot.dunya_1', 'chatbot.dunya_2', 'chatbot.dunya_3', 'chatbot.dunya_4', 'chatbot.dunya_5', 'chatbot.dunya_6', 'chatbot.dunya_7'],
  };
  var BOT_MSG_KEYS = {
    kavim: ['chatmsg.kavim_1','chatmsg.kavim_2','chatmsg.kavim_3','chatmsg.kavim_4','chatmsg.kavim_5','chatmsg.kavim_6','chatmsg.kavim_7','chatmsg.kavim_8','chatmsg.kavim_9','chatmsg.kavim_10','chatmsg.kavim_11','chatmsg.kavim_12'],
    dunya: ['chatmsg.dunya_1','chatmsg.dunya_2','chatmsg.dunya_3','chatmsg.dunya_4','chatmsg.dunya_5','chatmsg.dunya_6','chatmsg.dunya_7','chatmsg.dunya_8','chatmsg.dunya_9','chatmsg.dunya_10','chatmsg.dunya_11','chatmsg.dunya_12','chatmsg.dunya_13','chatmsg.dunya_14'],
  };
  var SYS_MSG_KEYS = ['sysmsg.1', 'sysmsg.2', 'sysmsg.3', 'sysmsg.4', 'sysmsg.5'];

  function init(name, city) {
    FB = SKY.FB;
    playerName = name;
    playerCity = city;
    // Clear local channels
    channels = { kavim: [], dunya: [], ozel: [], sistem: [] };
    activeChannel = 'dunya';
    expanded = false;

    // Add welcome system messages locally
    addLocal('sistem', SKY.LANG.t('chat.system'), SKY.LANG.t('chat.welcome', { name: name }));
    addLocal('sistem', SKY.LANG.t('chat.system'), SKY.LANG.t('chat.city_info', { city: city }));

    // Start Firebase listeners
    startListening();
  }

  function addLocal(channel, sender, text, isPlayer) {
    var now = new Date();
    var time = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    channels[channel].push({ sender: sender, text: text, time: time, isPlayer: !!isPlayer });
    if (channels[channel].length > 100) channels[channel].shift();
  }

  function startListening() {
    if (!FB || !FB.db) return;
    // Listen to each channel
    var chans = ['kavim', 'dunya', 'sistem'];
    for (var i = 0; i < chans.length; i++) {
      (function(ch) {
        // Detach old listener if any
        if (listeners[ch]) { listeners[ch].off(); }
        var ref = FB.db.ref('chat/' + ch).orderByChild('ts').limitToLast(50);
        ref.on('child_added', function(snap) {
          var msg = snap.val();
          if (!msg) return;
          // Don't duplicate: check if we already have this message
          var exists = channels[ch].some(function(m) { return m.fbKey === snap.key; });
          if (exists) return;
          var d = new Date(msg.ts || Date.now());
          var time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
          channels[ch].push({
            sender: msg.name || '???',
            text: msg.text || '',
            time: time,
            isPlayer: msg.uid === (FB.uid ? FB.uid() : ''),
            fbKey: snap.key,
            city: msg.city || ''
          });
          if (channels[ch].length > 100) channels[ch].shift();
          // Trigger UI update
          if (onNewMsg) onNewMsg(ch);
        });
        listeners[ch] = ref;
      })(chans[i]);
    }

    // Also listen for private messages (ozel) addressed to this user
    var uid = FB.uid ? FB.uid() : null;
    if (uid) {
      if (listeners.ozel) listeners.ozel.off();
      var pmRef = FB.db.ref('chat/pm/' + uid).orderByChild('ts').limitToLast(50);
      pmRef.on('child_added', function(snap) {
        var msg = snap.val();
        if (!msg) return;
        var exists = channels.ozel.some(function(m) { return m.fbKey === snap.key; });
        if (exists) return;
        var d = new Date(msg.ts || Date.now());
        var time = String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
        channels.ozel.push({
          sender: msg.name || '???',
          text: msg.text || '',
          time: time,
          isPlayer: msg.uid === uid,
          fbKey: snap.key
        });
        if (channels.ozel.length > 100) channels.ozel.shift();
        if (onNewMsg) onNewMsg('ozel');
      });
      listeners.ozel = pmRef;
    }
  }

  function stopListening() {
    for (var ch in listeners) {
      if (listeners[ch]) listeners[ch].off();
    }
    listeners = {};
  }

  // Send message to Firebase
  function sendMsg(channel, text) {
    if (!FB || !FB.db) {
      // Offline fallback
      addLocal(channel, playerName, text, true);
      return;
    }
    if (channel === 'sistem') return; // can't send to system

    var uid = FB.uid ? FB.uid() : 'anon';
    var msg = {
      name: playerName,
      text: text,
      city: playerCity,
      uid: uid,
      ts: firebase.database.ServerValue.TIMESTAMP
    };

    if (channel === 'ozel') {
      // Send PM to target user
      if (SKY.CHAT._pmTarget && SKY.CHAT._pmTarget.uid) {
        var target = SKY.CHAT._pmTarget;
        addLocal('ozel', playerName, '→ ' + target.name + ': ' + text, true);
        if (FB && FB.uid) {
          // Write to target's PM inbox
          FB.db.ref('chat/pm/' + target.uid).push({
            name: playerName, text: text, uid: FB.uid(),
            ts: firebase.database.ServerValue.TIMESTAMP
          });
          // Also write to own PM inbox (so we see sent messages)
          FB.db.ref('chat/pm/' + FB.uid()).push({
            name: playerName, text: '→ ' + target.name + ': ' + text, uid: FB.uid(),
            ts: firebase.database.ServerValue.TIMESTAMP
          });
        }
      } else {
        addLocal('ozel', SKY.LANG.t('chat.system'), SKY.LANG.t('chat.select_friend'), false);
      }
      return;
    }

    FB.db.ref('chat/' + channel).push(msg).catch(function(err) {
      // Fallback to local
      addLocal(channel, playerName, text, true);
    });
  }

  function getMessages(ch) { return channels[ch || activeChannel]; }
  function getChannel() { return activeChannel; }
  function setChannel(ch) { activeChannel = ch; }
  function isExpanded() { return expanded; }
  function toggleExpand() { expanded = !expanded; }
  function setExpanded(v) { expanded = v; }
  function setOnNewMsg(cb) { onNewMsg = cb; }

  // Bot tick - only for filling empty server
  var lastBotTick = 0;
  function botTick() {
    var now = Date.now();
    if (now - lastBotTick < 20000) return; // every 20s
    lastBotTick = now;
    // 30% chance
    if (Math.random() > 0.3) return;
    // Only send bot messages if offline/demo mode
    if (!FB || !FB.uid || !FB.uid()) {
      // offline bot
      var r = Math.random();
      var _t = SKY.LANG.t;
      if (r < 0.1) {
        addLocal('sistem', _t('chat.system'), _t(SYS_MSG_KEYS[Math.floor(Math.random() * SYS_MSG_KEYS.length)]));
      } else if (r < 0.4) {
        var nk = BOT_NAME_KEYS.kavim;
        var mk = BOT_MSG_KEYS.kavim;
        addLocal('kavim', _t(nk[Math.floor(Math.random() * nk.length)]), _t(mk[Math.floor(Math.random() * mk.length)]));
      } else {
        var nk2 = BOT_NAME_KEYS.dunya;
        var mk2 = BOT_MSG_KEYS.dunya;
        addLocal('dunya', _t(nk2[Math.floor(Math.random() * nk2.length)]), _t(mk2[Math.floor(Math.random() * mk2.length)]));
      }
    }
    // When online, real players provide chat — no bots needed
  }

  function getPreviewLines() {
    var active = channels[activeChannel];
    var lines = [];
    if (active.length >= 2) {
      lines.push(active[active.length - 2]);
      lines.push(active[active.length - 1]);
    } else if (active.length === 1) {
      lines.push(active[0]);
    }
    return lines;
  }

  function destroy() {
    stopListening();
    channels = { kavim: [], dunya: [], ozel: [], sistem: [] };
  }

  return {
    init: init, sendMsg: sendMsg, addLocal: addLocal,
    getMessages: getMessages, getChannel: getChannel, setChannel: setChannel,
    isExpanded: isExpanded, toggleExpand: toggleExpand, setExpanded: setExpanded,
    botTick: botTick, getPreviewLines: getPreviewLines,
    channels: channels, destroy: destroy, stopListening: stopListening,
    setOnNewMsg: setOnNewMsg,
    // PM target (set by friends system)
    _pmTarget: null,
    // Keep old addMsg for backward compat
    addMsg: addLocal,
  };
})();
