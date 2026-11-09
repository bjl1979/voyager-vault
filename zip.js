// Voyager Vault – trip backup (.zip with real folders) and restore
const ZipIO = {
  safe(s) {
    return (s || 'file').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'file';
  },
  ext(doc) {
    const m = (doc.fileName || '').match(/\.([a-z0-9]{2,5})$/i);
    if (m) return '.' + m[1].toLowerCase();
    if (doc.type === 'application/pdf') return '.pdf';
    if ((doc.type || '').startsWith('image/')) return '.' + doc.type.split('/')[1].replace('jpeg', 'jpg');
    return '';
  },
  backupName(trip) {
    return `${this.safe(trip.destination)}_${trip.start || 'trip'}`.replace(/ /g, '_');
  },

  /** Write one trip (documents in category folders + trip.json + readable text files) into `root`. */
  addTrip(root, trip, docs, categories) {
    const used = new Set();
    const manifest = { app: 'voyager-vault', version: 2, exported: new Date().toISOString(), trip, docs: [] };
    for (const d of docs) {
      const cat = categories.find(c => c.id === d.category) || { folder: 'Other' };
      let base = `${cat.folder}/${this.safe(d.title)}`;
      let path = base + this.ext(d), n = 2;
      while (used.has(path.toLowerCase())) path = `${base} (${n++})${this.ext(d)}`;
      used.add(path.toLowerCase());
      root.file(path, d.blob);
      const { blob, ...meta } = d;
      manifest.docs.push({ ...meta, path });
    }
    root.file('trip.json', JSON.stringify(manifest, null, 2));
    const todos = trip.todos || [];
    if (todos.length) {
      const order = { urgent: 0, normal: 1, delayed: 2 };
      const sorted = todos.slice().sort((a, b) => (a.done - b.done) || (order[a.priority] - order[b.priority]));
      root.file('ToDo.txt', `To-do – ${trip.destination}\n\n` + sorted.map(x =>
        `${x.done ? '[x]' : '[ ]'} ${(x.priority || 'normal').toUpperCase()}: ${x.title}` +
        (x.remindAt ? `  (remind ${x.remindAt.replace('T', ' ')})` : '') +
        (x.details ? `\n    ${x.details}` : '')).join('\n') + '\n');
    }
    const secs = (trip.carry && trip.carry.sections) || [];
    if (secs.some(s => s.items.length)) {
      root.file('Packing.txt', `Things to carry – ${trip.destination}\n` + secs.map(s => `\n${s.name.toUpperCase()}\n` +
        s.items.map(i => `  ${i.packed ? '[x]' : '[ ]'} ${i.text}${i.qty ? ' ×' + i.qty : ''}`).join('\n')).join('\n') + '\n');
    }
    const notes = trip.noteItems || [];
    if (notes.length) {
      root.file('Notes.txt', `Notes – ${trip.destination}\n\n` + notes.map(n =>
        `${n.done ? '[x]' : '[ ]'} ${n.topic ? n.topic.toUpperCase() + ': ' : ''}${n.text}`).join('\n\n') + '\n');
    }
    root.file('README.txt',
      `Voyager Vault backup – ${trip.destination}${trip.country ? ', ' + trip.country : ''}\n` +
      `Dates: ${trip.start || '?'} to ${trip.end || '?'}\n` +
      `Documents: ${docs.length} · Tasks: ${todos.length} · Notes: ${notes.length}\n\n` +
      `Each folder holds the original files. To bring this trip back into the app,\n` +
      `open Voyager Vault > Settings > Restore a backup, and pick this .zip file.\n`);
  },

  async buildBackup(trip, docs, categories) {
    const zip = new JSZip();
    this.addTrip(zip.folder(this.backupName(trip)), trip, docs, categories);
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    return new File([blob], this.backupName(trip) + '.zip', { type: 'application/zip' });
  },

  /** Every trip in one zip: VoyagerVault_all_<date>/<Trip_date>/… */
  async buildAll(trips, docsByTrip, categories) {
    const zip = new JSZip();
    const stamp = new Date().toISOString().slice(0, 10);
    const top = zip.folder(`VoyagerVault_all_${stamp}`);
    const names = new Set();
    for (const t of trips) {
      let name = this.backupName(t), n = 2;
      while (names.has(name)) name = `${this.backupName(t)}_${n++}`;
      names.add(name);
      this.addTrip(top.folder(name), t, docsByTrip[t.id] || [], categories);
    }
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    return new File([blob], `VoyagerVault_all_${stamp}.zip`, { type: 'application/zip' });
  },

  /** Returns [{trip, docs}] – one entry per trip.json found (single-trip or all-trips backup). */
  async readBackup(file) {
    const zip = await JSZip.loadAsync(file);
    const manifests = Object.keys(zip.files).filter(p => /(^|\/)trip\.json$/.test(p) && !zip.files[p].dir);
    if (!manifests.length) throw new Error('This zip is not a Voyager Vault backup (trip.json missing).');
    const out = [];
    for (const mf of manifests) {
      const prefix = mf.slice(0, mf.length - 'trip.json'.length);
      const manifest = JSON.parse(await zip.file(mf).async('string'));
      if (manifest.app !== 'voyager-vault') continue;
      const docs = [];
      for (const m of manifest.docs) {
        const f = zip.file(prefix + m.path);
        if (!f) continue;
        const data = await f.async('arraybuffer');
        const { path, ...meta } = m;
        docs.push({ ...meta, blob: new Blob([data], { type: m.type || '' }) });
      }
      out.push({ trip: manifest.trip, docs });
    }
    if (!out.length) throw new Error('Unrecognised backup file.');
    return out;
  },
};
window.ZipIO = ZipIO;
