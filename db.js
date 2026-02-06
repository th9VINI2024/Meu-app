let db;

const DB_NAME = "music-player";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = e => {
      db = e.target.result;

      if (!db.objectStoreNames.contains("musics")) {
        const musics = db.createObjectStore("musics", {
          keyPath: "id",
          autoIncrement: true
        });
        musics.createIndex("artist", "artist", { unique: false });
      }

      if (!db.objectStoreNames.contains("playlists")) {
        db.createObjectStore("playlists", {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains("playlist_tracks")) {
        db.createObjectStore("playlist_tracks", {
          keyPath: "id",
          autoIncrement: true
        });
      }
    };

    request.onsuccess = e => {
      db = e.target.result;
      resolve(db);
    };

    request.onerror = e => reject(e);
  });
}

/* ===== MUSICAS ===== */
async function saveMusic(music) {
  const database = await openDB();
  const tx = database.transaction("musics", "readwrite");
  tx.objectStore("musics").add(music);
}

async function getAllMusics() {
  const database = await openDB();
  return new Promise(resolve => {
    const tx = database.transaction("musics", "readonly");
    const req = tx.objectStore("musics").getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

/* ===== PLAYLISTS ===== */
async function createPlaylist(name) {
  const database = await openDB();
  const tx = database.transaction("playlists", "readwrite");
  tx.objectStore("playlists").add({ name });
}

async function getPlaylists() {
  const database = await openDB();
  return new Promise(resolve => {
    const tx = database.transaction("playlists", "readonly");
    const req = tx.objectStore("playlists").getAll();
    req.onsuccess = () => resolve(req.result);
  });
}

/* ===== RELAÇÃO PLAYLIST ↔ MUSICAS ===== */
async function addMusicToPlaylist(playlistId, musicId) {
  const database = await openDB();
  const tx = database.transaction("playlist_tracks", "readwrite");
  tx.objectStore("playlist_tracks").add({
    playlistId,
    musicId
  });
}

async function getPlaylistMusics(playlistId) {
  const database = await openDB();
  return new Promise(resolve => {
    const tx = database.transaction(["playlist_tracks", "musics"], "readonly");
    const relStore = tx.objectStore("playlist_tracks");
    const musicStore = tx.objectStore("musics");

    const result = [];
    relStore.getAll().onsuccess = e => {
      const relations = e.target.result.filter(r => r.playlistId === playlistId);

      let loaded = 0;
      if (relations.length === 0) resolve([]);

      relations.forEach(r => {
        musicStore.get(r.musicId).onsuccess = ev => {
          result.push(ev.target.result);
          loaded++;
          if (loaded === relations.length) resolve(result);
        };
      });
    };
  });
}
