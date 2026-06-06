/* SKYZONE · FIREBASE INIT */
window.SKY = window.SKY || {};
(function() {
  var firebaseConfig = {
    apiKey: "AIzaSyAvjP9XYeMTWQti7JkT_ChBvOLdEsLHj30",
    authDomain: "game-facbd.firebaseapp.com",
    databaseURL: "https://game-facbd-default-rtdb.firebaseio.com",
    projectId: "game-facbd",
    storageBucket: "game-facbd.firebasestorage.app",
    messagingSenderId: "320816792959",
    appId: "1:320816792959:web:5ff874aeccfd4a44bb064a"
  };
  firebase.initializeApp(firebaseConfig);

  SKY.FB = {
    auth: firebase.auth(),
    db: firebase.database(),
    // helper: current user UID
    uid: function() {
      var u = firebase.auth().currentUser;
      return u ? u.uid : null;
    },
    // save player state to Firebase DB
    saveState: function(charIdx, stateObj) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve();
      return firebase.database().ref('players/' + uid + '/chars/' + charIdx).set(stateObj);
    },
    // load player state from Firebase DB
    loadState: function(charIdx) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve(null);
      return firebase.database().ref('players/' + uid + '/chars/' + charIdx).once('value').then(function(snap) {
        return snap.val();
      });
    },
    // save account meta (characters list, username)
    saveAccountMeta: function(meta) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve();
      return firebase.database().ref('players/' + uid + '/meta').set(meta);
    },
    loadAccountMeta: function() {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve(null);
      return firebase.database().ref('players/' + uid + '/meta').once('value').then(function(snap) {
        return snap.val();
      });
    },
    // Chat: send message to a channel
    sendChat: function(channel, msg) {
      return firebase.database().ref('chat/' + channel).push(msg);
    },
    // Chat: listen to channel (returns ref for detaching)
    listenChat: function(channel, callback, limit) {
      var ref = firebase.database().ref('chat/' + channel).orderByChild('ts').limitToLast(limit || 50);
      ref.on('child_added', function(snap) {
        callback(snap.val());
      });
      return ref;
    },
    // Chat: stop listening
    offChat: function(ref) {
      if (ref) ref.off();
    },
    // Online presence
    setOnline: function(playerName, city, zone) {
      var uid = SKY.FB.uid();
      if (!uid) return;
      var ref = firebase.database().ref('online/' + uid);
      ref.set({ name: playerName, city: city, zone: zone || '', ts: firebase.database.ServerValue.TIMESTAMP });
      ref.onDisconnect().remove();
    },
    updateZone: function(zone) {
      var uid = SKY.FB.uid();
      if (!uid) return;
      firebase.database().ref('online/' + uid + '/zone').set(zone || '');
    },
    goOffline: function() {
      var uid = SKY.FB.uid();
      if (!uid) return;
      firebase.database().ref('online/' + uid).remove();
    },
    // ---- Online Players ----
    getOnlinePlayers: function(zone) {
      return firebase.database().ref('online')
        .once('value')
        .then(function(snap) {
          var list = [];
          var myUid = SKY.FB.uid();
          snap.forEach(function(child) {
            if (child.key === myUid) return;
            var v = child.val();
            if (zone && v.zone !== zone) return;
            v.uid = child.key;
            list.push(v);
          });
          return list;
        });
    },
    // ---- Friends System ----
    sendFriendRequest: function(toUid, myName, myCity) {
      var uid = SKY.FB.uid();
      if (!uid || uid === toUid) return Promise.resolve();
      return firebase.database().ref('friendRequests/' + toUid + '/' + uid).set({
        name: myName, city: myCity, ts: firebase.database.ServerValue.TIMESTAMP
      });
    },
    acceptFriendRequest: function(fromUid, fromName, fromCity, myName, myCity) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve();
      var updates = {};
      // Add each other as friends
      updates['friends/' + uid + '/' + fromUid] = { name: fromName, city: fromCity, addedAt: firebase.database.ServerValue.TIMESTAMP };
      updates['friends/' + fromUid + '/' + uid] = { name: myName, city: myCity, addedAt: firebase.database.ServerValue.TIMESTAMP };
      // Remove the request
      updates['friendRequests/' + uid + '/' + fromUid] = null;
      return firebase.database().ref().update(updates);
    },
    rejectFriendRequest: function(fromUid) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve();
      return firebase.database().ref('friendRequests/' + uid + '/' + fromUid).remove();
    },
    removeFriend: function(friendUid) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve();
      var updates = {};
      updates['friends/' + uid + '/' + friendUid] = null;
      updates['friends/' + friendUid + '/' + uid] = null;
      return firebase.database().ref().update(updates);
    },
    getFriends: function() {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve([]);
      return firebase.database().ref('friends/' + uid).once('value').then(function(snap) {
        var list = [];
        snap.forEach(function(child) {
          var v = child.val();
          v.uid = child.key;
          list.push(v);
        });
        return list;
      });
    },
    getFriendRequests: function() {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve([]);
      return firebase.database().ref('friendRequests/' + uid).once('value').then(function(snap) {
        var list = [];
        snap.forEach(function(child) {
          var v = child.val();
          v.uid = child.key;
          list.push(v);
        });
        return list;
      });
    },
    // Send PM to a specific user
    sendPM: function(toUid, myName, text) {
      var uid = SKY.FB.uid();
      if (!uid) return Promise.resolve();
      var msg = {
        name: myName, text: text, uid: uid,
        ts: firebase.database.ServerValue.TIMESTAMP
      };
      // Write to recipient's PM inbox
      return firebase.database().ref('chat/pm/' + toUid).push(msg);
    },
    // ---- Shared World (Zone Nodes) ----
    _zoneListener: null,
    _zoneListenId: null,
    // Load zone nodes from Firebase
    loadZoneNodes: function(zoneId) {
      return firebase.database().ref('world/' + zoneId + '/nodes').once('value').then(function(snap) {
        var val = snap.val();
        if (!val) return null; // no nodes exist yet
        // Convert object to array
        var list = [];
        for (var k in val) { val[k].id = k; list.push(val[k]); }
        return list;
      });
    },
    // Save entire zone node set (used when first generating)
    saveZoneNodes: function(zoneId, nodes) {
      var obj = {};
      for (var i = 0; i < nodes.length; i++) {
        obj[nodes[i].id] = nodes[i];
      }
      return firebase.database().ref('world/' + zoneId + '/nodes').set(obj);
    },
    // Update a single node (e.g. remaining changed after harvest)
    updateNode: function(zoneId, nodeId, data) {
      return firebase.database().ref('world/' + zoneId + '/nodes/' + nodeId).update(data);
    },
    // Replace a single node (respawn)
    setNode: function(zoneId, nodeId, node) {
      return firebase.database().ref('world/' + zoneId + '/nodes/' + nodeId).set(node);
    },
    // Remove a node
    removeNode: function(zoneId, nodeId) {
      return firebase.database().ref('world/' + zoneId + '/nodes/' + nodeId).remove();
    },
    // Atomic decrement of node remaining (transaction)
    harvestNode: function(zoneId, nodeId, amount) {
      var ref = firebase.database().ref('world/' + zoneId + '/nodes/' + nodeId + '/remaining');
      return ref.transaction(function(current) {
        if (current === null || current <= 0) return 0;
        return Math.max(0, current - amount);
      }).then(function(result) {
        return { committed: result.committed, remaining: result.snapshot.val() };
      });
    },
    // Listen for real-time zone node changes
    listenZoneNodes: function(zoneId, onUpdate) {
      SKY.FB.stopListenZone();
      SKY.FB._zoneListenId = zoneId;
      var ref = firebase.database().ref('world/' + zoneId + '/nodes');
      // child_changed: node updated (remaining, etc.)
      ref.on('child_changed', function(snap) {
        if (onUpdate) onUpdate('changed', snap.key, snap.val());
      });
      // child_added: new node spawned by another player
      ref.on('child_added', function(snap) {
        if (onUpdate) onUpdate('added', snap.key, snap.val());
      });
      // child_removed: node removed
      ref.on('child_removed', function(snap) {
        if (onUpdate) onUpdate('removed', snap.key, null);
      });
      SKY.FB._zoneListener = ref;
    },
    stopListenZone: function() {
      if (SKY.FB._zoneListener) {
        SKY.FB._zoneListener.off();
        SKY.FB._zoneListener = null;
        SKY.FB._zoneListenId = null;
      }
    },

    // ---- Single Session Enforcement ----
    _sessionId: null,
    _sessionRef: null,
    _sessionListener: null,
    // Generate unique session ID
    _genSessionId: function() {
      return 'sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
    },
    // Claim session: write sessionId to Firebase, listen for changes
    claimSession: function(charIdx, onKicked) {
      var uid = SKY.FB.uid();
      if (!uid) return;
      // Generate unique session ID for this tab/device
      SKY.FB._sessionId = SKY.FB._genSessionId();
      var ref = firebase.database().ref('sessions/' + uid);
      SKY.FB._sessionRef = ref;
      // Write our session
      ref.set({
        sessionId: SKY.FB._sessionId,
        charIdx: charIdx,
        ts: firebase.database.ServerValue.TIMESTAMP,
        device: navigator.userAgent.substring(0, 60)
      });
      // Remove session on disconnect
      ref.onDisconnect().remove();
      // Listen for changes — if another device claims session, we get kicked
      if (SKY.FB._sessionListener) ref.off('value', SKY.FB._sessionListener);
      SKY.FB._sessionListener = ref.on('value', function(snap) {
        var val = snap.val();
        if (!val) return; // session deleted (disconnect)
        if (val.sessionId && val.sessionId !== SKY.FB._sessionId) {
          // Another device took over! Kick this session
          ref.off('value', SKY.FB._sessionListener);
          SKY.FB._sessionListener = null;
          if (onKicked) onKicked();
        }
      });
    },
    // Release session
    releaseSession: function() {
      if (SKY.FB._sessionRef) {
        if (SKY.FB._sessionListener) {
          SKY.FB._sessionRef.off('value', SKY.FB._sessionListener);
          SKY.FB._sessionListener = null;
        }
        SKY.FB._sessionRef.remove();
        SKY.FB._sessionRef = null;
      }
      SKY.FB._sessionId = null;
    },
    // ---- Leaderboard ----
    updateLeaderboard: function(name, city, cp) {
      var uid = SKY.FB.uid();
      if (!uid) return;
      firebase.database().ref('leaderboard/' + uid).set({
        name: name, city: city, cp: cp,
        ts: firebase.database.ServerValue.TIMESTAMP
      });
    },
    getLeaderboard: function(limit) {
      // Read all leaderboard data and sort client-side (avoids .indexOn rule requirement)
      return firebase.database().ref('leaderboard')
        .once('value')
        .then(function(snap) {
          var list = [];
          snap.forEach(function(child) {
            var v = child.val();
            v.uid = child.key;
            list.push(v);
          });
          // Sort by CP descending (client-side)
          list.sort(function(a, b) { return (b.cp || 0) - (a.cp || 0); });
          // Limit
          if (limit && list.length > limit) list = list.slice(0, limit);
          return list;
        });
    },
    // ---- Username Registry ----
    // Kayıt sırasında username→email mapping'i yaz
    registerUsername: function(username, email) {
      var lower = username.toLowerCase();
      return firebase.database().ref('usernames/' + lower).set({
        email: email,
        uid: SKY.FB.uid()
      });
    },
    // Username'den e-posta bul (giriş için)
    lookupUsername: function(username) {
      var lower = username.toLowerCase();
      return firebase.database().ref('usernames/' + lower).once('value').then(function(snap) {
        return snap.val(); // {email, uid} veya null
      });
    },
    // Username müsait mi kontrol et
    isUsernameAvailable: function(username) {
      var lower = username.toLowerCase();
      return firebase.database().ref('usernames/' + lower).once('value').then(function(snap) {
        return !snap.exists();
      });
    }
  };
})();
